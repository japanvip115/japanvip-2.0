import { prisma } from '@japanvip/db'
import { unstable_cache } from 'next/cache'

export type NavCategory = { name: string; slug: string; children: { name: string; slug: string }[] }
export type NavData = {
  logoUrl: string
  blogCategories: { name: string; slug: string }[]
  productCategories: NavCategory[]
}

// Logo + danh mục cho Header/Footer — đổi hiếm nên cache 5 phút.
// Trước đây Header query Neon mỗi request (chạy trên MỌI trang) → chậm.
export const getNavData = unstable_cache(
  async (): Promise<NavData> => {
    const [logoRow, blogCategories, productCategories] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { key: 'site_logo_url' } }),
      prisma.blogCategory.findMany({ orderBy: { name: 'asc' }, select: { name: true, slug: true } }),
      prisma.category.findMany({
        where: { isActive: true, parentId: null },
        orderBy: { sortOrder: 'asc' },
        select: { name: true, slug: true, children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' }, select: { name: true, slug: true } } },
      }),
    ])
    return { logoUrl: logoRow?.value ?? '', blogCategories, productCategories }
  },
  ['nav-data-v1'],
  { revalidate: 300, tags: ['nav-data'] }
)
