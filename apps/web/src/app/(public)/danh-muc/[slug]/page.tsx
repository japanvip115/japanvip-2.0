import { permanentRedirect, notFound } from 'next/navigation'
import { prisma } from '@japanvip/db'

export const revalidate = 300

// Pre-render redirect danh mục tại build → cache, khỏi query mỗi request.
export async function generateStaticParams() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: { slug: true },
  })
  return categories.map((c) => ({ slug: c.slug }))
}

export default async function CategorySlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const category = await prisma.category.findUnique({
    where: { slug },
    select: { id: true },
  })
  if (!category) notFound()
  permanentRedirect(`/san-pham?categoryId=${category.id}`)
}
