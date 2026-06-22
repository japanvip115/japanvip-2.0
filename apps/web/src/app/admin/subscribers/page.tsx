import { Suspense } from 'react'
import { SubscribersClient } from './subscribers-client'

export const metadata = { title: 'Quản Lý Subscriber | Admin Japan VIP' }

export default function SubscribersPage() {
  return (
    <Suspense>
      <SubscribersClient />
    </Suspense>
  )
}
