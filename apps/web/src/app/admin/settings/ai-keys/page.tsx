import type { Metadata } from 'next'
import { AiKeysClient } from './ai-keys-client'

export const metadata: Metadata = { title: 'AI API Keys — Japan VIP Admin' }

export default function AiKeysPage() {
  return <AiKeysClient />
}
