import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { findRelatedProducts } from '@/lib/blog-scraper'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { title } = await req.json()
  if (!title) return NextResponse.json([])
  const products = await findRelatedProducts(title)
  return NextResponse.json(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.salePrice ? Number(p.salePrice) : null,
      image: (p.images as { url: string }[])[0]?.url ?? null,
    })),
  )
}
