import type { Metadata } from 'next'
import { KnowledgeClient } from './knowledge-client'

export const metadata: Metadata = { title: 'Kho tri thức — Japan VIP Admin' }

export default function KnowledgePage() {
  return <KnowledgeClient />
}
