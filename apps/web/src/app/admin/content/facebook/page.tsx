import type { Metadata } from 'next'
import { FacebookContentClient } from './facebook-client'

export const metadata: Metadata = { title: 'Bài đăng Facebook — Japan VIP Admin' }

export default function FacebookContentPage() {
  return <FacebookContentClient />
}
