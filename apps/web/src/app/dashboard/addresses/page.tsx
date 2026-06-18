import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@japanvip/db'
import { AddressManagerClient } from './address-manager-client'

export const metadata: Metadata = { title: 'Địa Chỉ Giao Hàng' }

export default async function AddressesPage() {
  const session = await auth()
  const addresses = await prisma.address.findMany({
    where: { userId: session!.user!.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  })

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Địa Chỉ Giao Hàng</h1>
        <p className="text-sm text-gray-500 mt-1">Quản lý các địa chỉ nhận hàng của bạn</p>
      </div>
      <AddressManagerClient initialAddresses={addresses} />
    </div>
  )
}
