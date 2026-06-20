import type { Metadata } from 'next'
import { AiStyleClient } from './ai-style-client'

export const metadata: Metadata = { title: 'Admin — Style Content AI' }

export default function AiStylePage() {
  return <AiStyleClient />
}
