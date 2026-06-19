import { prisma } from '@japanvip/db'
import { BlogScrapeSettings } from '@/components/admin/blog-scrape-settings'

export default async function BlogScrapeSettingsPage() {
  const row = await prisma.siteSetting.findUnique({ where: { key: 'blog_scrape_blocklist' } })
  const blocklist: string[] = row ? JSON.parse(row.value) : []
  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
          <a href="/admin/settings" className="hover:text-gray-300">Cài Đặt</a>
          <span>/</span>
          <span>Lọc Nội Dung Blog</span>
        </div>
        <h1 className="text-xl font-bold text-white">Lọc Nội Dung Khi Nhập Bài</h1>
        <p className="mt-1 text-sm text-gray-400">Tự động xóa backlink, số điện thoại, hoặc đoạn văn bản không mong muốn khỏi bài viết được nhập từ URL.</p>
      </div>
      <BlogScrapeSettings initial={blocklist} />
    </div>
  )
}
