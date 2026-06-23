import type { Metadata } from 'next'
import { FacebookSettingsClient } from './facebook-client'

export const metadata: Metadata = { title: 'Facebook Marketing — Japan VIP Admin' }

export default function FacebookSettingsPage() {
  return <FacebookSettingsClient />
}
