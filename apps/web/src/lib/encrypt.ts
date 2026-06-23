import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT_LENGTH = 16
const LEGACY_SALT = 'japanvip-v2-salt'

function getSecret(): string {
  const secret = process.env.ENCRYPTION_KEY
  if (!secret) throw new Error('ENCRYPTION_KEY env var is not set')
  return secret
}

// New format: salt:iv:tag:data (4 parts, each hex)
export function encrypt(plaintext: string): string {
  const secret = getSecret()
  const salt = randomBytes(SALT_LENGTH)
  const key = scryptSync(secret, salt, 32)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [salt.toString('hex'), iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':')
}

// Decrypt new format (salt:iv:tag:data)
export function decrypt(ciphertext: string): string {
  const secret = getSecret()
  const parts = ciphertext.split(':')
  if (parts.length === 3) return decryptLegacy(ciphertext) // định dạng cũ iv:tag:data
  if (parts.length !== 4) throw new Error('Invalid ciphertext format')
  const key = scryptSync(secret, Buffer.from(parts[0]!, 'hex'), 32)
  const iv = Buffer.from(parts[1]!, 'hex')
  const tag = Buffer.from(parts[2]!, 'hex')
  const data = Buffer.from(parts[3]!, 'hex')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(data) + decipher.final('utf8')
}

// Decrypt legacy format (iv:tag:data, fixed salt)
function decryptLegacy(ciphertext: string): string {
  const secret = getSecret()
  const parts = ciphertext.split(':')
  const key = scryptSync(secret, LEGACY_SALT, 32)
  const iv = Buffer.from(parts[0]!, 'hex')
  const tag = Buffer.from(parts[1]!, 'hex')
  const data = Buffer.from(parts[2]!, 'hex')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(data) + decipher.final('utf8')
}

export function isEncrypted(value: string): boolean {
  const parts = value.split(':')
  // Accept both new (4 parts) and legacy (3 parts) formats
  return (parts.length === 4 || parts.length === 3) && parts.every(p => /^[0-9a-f]+$/i.test(p))
}

export function encryptIfNeeded(value: string | null | undefined): string | null {
  if (!value) return null
  if (isEncrypted(value)) return value
  return encrypt(value)
}

export function decryptIfNeeded(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const parts = value.split(':')
    if (parts.length === 4 && parts.every(p => /^[0-9a-f]+$/i.test(p))) return decrypt(value)
    if (parts.length === 3 && parts.every(p => /^[0-9a-f]+$/i.test(p))) return decryptLegacy(value)
    return value
  } catch {
    return value
  }
}
