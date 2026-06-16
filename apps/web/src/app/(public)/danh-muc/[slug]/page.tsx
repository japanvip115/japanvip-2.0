import { redirect, notFound } from 'next/navigation'
import { prisma } from '@japanvip/db'

export const revalidate = 60

export default async function CategorySlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const category = await prisma.category.findUnique({
    where: { slug },
    select: { id: true },
  })
  if (!category) notFound()
  redirect(`/san-pham?categoryId=${category.id}`)
}
