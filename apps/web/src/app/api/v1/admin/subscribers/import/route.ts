import { NextRequest } from 'next/server'
import * as XLSX from 'xlsx'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

export const maxDuration = 60

type Row = Record<string, string | number | null | undefined>

function normalize(val: unknown): string {
  if (val == null) return ''
  return String(val).trim()
}

function parseRows(rows: Row[]): { email: string; name: string; phone: string; city: string }[] {
  return rows.map((row) => {
    // Support both GetResponse columns and generic columns
    const email = normalize(row['email'] ?? row['Email'] ?? row['EMAIL'])
    const firstname = normalize(row['firstname'] ?? row['first_name'] ?? row['FirstName'] ?? row['Firstname'] ?? '')
    const lastname = normalize(row['lastname'] ?? row['last_name'] ?? row['LastName'] ?? row['Lastname'] ?? '')
    const name = normalize(row['name'] ?? row['Name'] ?? row['fullname'] ?? row['full_name'] ?? `${firstname} ${lastname}`.trim())
    const phone = normalize(row['mobile'] ?? row['phone'] ?? row['Mobile'] ?? row['Phone'] ?? '')
    const city = normalize(row['city'] ?? row['City'] ?? '')
    return { email, name, phone, city }
  }).filter(r => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email))
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as any).role, 'ADMIN')) return apiError('Unauthorized', 401)

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return apiError('Thiếu file', 400)

    const buffer = Buffer.from(await file.arrayBuffer())
    const isCSV = file.name.toLowerCase().endsWith('.csv')
    const wb = isCSV
      ? XLSX.read(buffer.toString('utf-8').replace(/^﻿/, ''), { type: 'string' })
      : XLSX.read(buffer, { type: 'buffer' })
    const sheetName = wb.SheetNames[0]
    if (!sheetName) return apiError('File Excel không có sheet nào', 400)
    const ws = wb.Sheets[sheetName]!
    const rows: Row[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

    const parsed = parseRows(rows)
    if (parsed.length === 0) return apiError('Không tìm thấy dòng nào có email hợp lệ', 400)

    // Upsert từng batch: thêm mới hoặc cập nhật tên/SĐT nếu email đã tồn tại
    let upserted = 0
    const CHUNK = 500
    for (let i = 0; i < parsed.length; i += CHUNK) {
      const chunk = parsed.slice(i, i + CHUNK)
      await Promise.all(chunk.map(r =>
        prisma.subscriber.upsert({
          where: { email: r.email.toLowerCase() },
          create: { email: r.email.toLowerCase(), name: r.name || null, phone: r.phone || null, city: r.city || null, source: 'getresponse', status: 'ACTIVE' },
          update: { name: r.name || null, phone: r.phone || null, city: r.city || null },
        })
      ))
      upserted += chunk.length
    }

    return apiSuccess({
      imported: upserted,
      total: parsed.length,
      skipped: 0,
    }, `Đã import/cập nhật ${upserted} subscriber`)
  } catch (err) {
    return handleApiError(err)
  }
}
