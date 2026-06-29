import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@japanvip/db'
import { stripBrandSuffix } from '@/lib/seo'
import { ProductCard } from '@/components/product/product-card'

export const revalidate = 300

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://japanvip.vn'

type Props = { params: Promise<{ slug: string }> }

function getCategory(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, description: true, metaTitle: true, metaDesc: true, imageUrl: true, imagePosition: true },
  })
}

// Pre-render danh mục tại build → SSG cache CDN.
export async function generateStaticParams() {
  const categories = await prisma.category.findMany({ where: { isActive: true }, select: { slug: true } })
  return categories.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const category = await getCategory(slug)
  if (!category) return { title: 'Không tìm thấy danh mục' }

  const title = stripBrandSuffix(category.metaTitle?.trim() || `${category.name} Nội Địa Nhật Bản Chính Hãng`)
  const description =
    category.metaDesc?.trim() ||
    category.description?.replace(/\s+/g, ' ').trim().slice(0, 160) ||
    `Mua ${category.name} nội địa Nhật Bản chính hãng, mới 100% tại Japan VIP. Bảo hành 12 tháng, giao hàng toàn quốc.`

  return {
    title,
    description,
    alternates: { canonical: `/danh-muc/${slug}` },
    openGraph: {
      title,
      description,
      type: 'website',
      images: [category.imageUrl || '/og-default.jpg'],
    },
  }
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params
  const category = await getCategory(slug)
  if (!category) notFound()

  // Sản phẩm thuộc danh mục + danh mục con
  const children = await prisma.category.findMany({ where: { parentId: category.id }, select: { id: true } })
  const categoryIds = [category.id, ...children.map((c) => c.id)]

  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE', categoryId: { in: categoryIds } },
    orderBy: { createdAt: 'desc' },
    take: 24,
    include: {
      images: { where: { isPrimary: true }, take: 1 },
      category: { select: { name: true } },
      brand: { select: { name: true } },
    },
  })

  const intro =
    category.description?.trim() ||
    `Khám phá bộ sưu tập ${category.name.toLowerCase()} nội địa Nhật Bản chính hãng tại Japan VIP — sản phẩm mới 100%, ` +
      `nhập khẩu trực tiếp từ Nhật, bảo hành 12 tháng và giao hàng toàn quốc. Đội ngũ Japan VIP luôn sẵn sàng tư vấn ` +
      `giúp bạn chọn được ${category.name.toLowerCase()} phù hợp nhất với nhu cầu và không gian sống.`

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${category.name} Nội Địa Nhật Bản`,
      url: `${BASE_URL}/danh-muc/${slug}`,
      isPartOf: { '@type': 'WebSite', name: 'Japan VIP', url: BASE_URL },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: category.name, item: `${BASE_URL}/danh-muc/${slug}` },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {category.imageUrl && (
          <div className="relative mb-5 h-40 w-full overflow-hidden rounded-2xl bg-gray-100 md:h-56">
            <Image
              src={category.imageUrl}
              alt={category.name}
              fill
              className="object-cover"
              style={{ objectPosition: category.imagePosition ?? 'center' }}
              sizes="(max-width: 1024px) 100vw, 1152px"
              priority
            />
          </div>
        )}

        <h1 className="mb-3 text-2xl font-bold text-gray-900 md:text-3xl">
          {category.name} Nội Địa Nhật Bản
        </h1>

        <div className="legal-content mb-8 max-w-3xl whitespace-pre-line text-[15px] leading-relaxed text-gray-600">
          {intro}
        </div>

        {products.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-gray-50 py-16 text-center text-gray-400">
            <p>Danh mục đang được cập nhật sản phẩm.</p>
            <Link href="/san-pham" className="mt-3 inline-block text-brand-red underline">Xem tất cả sản phẩm</Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>

            <div className="mt-8 text-center">
              <Link
                href={`/san-pham?categoryId=${category.id}`}
                className="inline-block rounded-lg border border-brand-red px-6 py-2.5 text-sm font-semibold text-brand-red transition-colors hover:bg-brand-red hover:text-white"
              >
                Xem tất cả {category.name} + bộ lọc →
              </Link>
            </div>
          </>
        )}

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </div>
    </div>
  )
}
