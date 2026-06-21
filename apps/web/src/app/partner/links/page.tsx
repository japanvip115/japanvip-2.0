import type { Metadata } from 'next'
import { PartnerLinksClient } from '@/components/partner/partner-links-client'

export const metadata: Metadata = { title: 'Link Giới Thiệu — CTV' }

export default function PartnerLinksPage() {
  return <PartnerLinksClient />
}
