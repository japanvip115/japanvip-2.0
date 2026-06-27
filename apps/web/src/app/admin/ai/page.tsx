import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@japanvip/db'
import {
  Wand2, BookOpen, Database, Boxes, FileText, CheckCircle2, Clock,
  Sparkles, ChevronRight, BrainCircuit,
} from 'lucide-react'
import { channelLabel } from '@/lib/content-studio/channels'

export const metadata: Metadata = { title: 'Tổng quan AI — Japan VIP Admin' }
export const dynamic = 'force-dynamic'

export default async function AiDashboardPage() {
  const [
    caTotal, caPending, caApproved, caAiGen,
    kbArticles, kbApproved, facts, factsVerified, cats, profiles,
    recentContent, recentArticles, byChannelRaw,
  ] = await Promise.all([
    prisma.contentAsset.count(),
    prisma.contentAsset.count({ where: { status: 'PENDING_REVIEW' } }),
    prisma.contentAsset.count({ where: { status: 'APPROVED' } }),
    prisma.contentAsset.count({ where: { status: 'AI_GENERATED' } }),
    prisma.knowledgeArticle.count(),
    prisma.knowledgeArticle.count({ where: { status: 'APPROVED' } }),
    prisma.knowledgeFact.count(),
    prisma.knowledgeFact.count({ where: { verificationStatus: 'VERIFIED' } }),
    prisma.knowledgeCategory.count(),
    prisma.productKnowledgeProfile.count(),
    prisma.contentAsset.findMany({ orderBy: { createdAt: 'desc' }, take: 6, select: { id: true, title: true, channel: true, status: true, createdAt: true } }),
    prisma.knowledgeArticle.findMany({ orderBy: { updatedAt: 'desc' }, take: 6, select: { id: true, title: true, status: true, updatedAt: true } }),
    prisma.contentAsset.groupBy({ by: ['channel'], _count: { _all: true } }),
  ])

  const topChannels = [...byChannelRaw].sort((a, b) => b._count._all - a._count._all).slice(0, 6)

  const stats = [
    { label: 'Nội dung đã tạo', value: caTotal, icon: Wand2, color: 'text-pink-400' },
    { label: 'Chờ duyệt', value: caPending, icon: Clock, color: 'text-amber-400' },
    { label: 'Đã duyệt', value: caApproved, icon: CheckCircle2, color: 'text-emerald-400' },
    { label: 'AI tạo (chưa xử lý)', value: caAiGen, icon: Sparkles, color: 'text-purple-400' },
    { label: 'Bài tri thức (duyệt)', value: `${kbApproved}/${kbArticles}`, icon: BookOpen, color: 'text-blue-400' },
    { label: 'Dữ kiện (xác minh)', value: `${factsVerified}/${facts}`, icon: Database, color: 'text-cyan-400' },
    { label: 'Danh mục tri thức', value: cats, icon: FileText, color: 'text-slate-300' },
    { label: 'Hồ sơ SP đã phân tích', value: profiles, icon: BrainCircuit, color: 'text-orange-400' },
  ]

  const shortcuts = [
    { href: '/admin/content/studio', label: 'Tạo nội dung đa kênh', icon: Wand2 },
    { href: '/admin/ai/products', label: 'Phân tích sản phẩm', icon: BrainCircuit },
    { href: '/admin/knowledge', label: 'Thêm bài tri thức', icon: BookOpen },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-white"><Sparkles className="h-5 w-5 text-brand-red" /> Tổng quan AI</h1>
        <p className="mt-0.5 text-sm text-slate-500">Nội dung, kho tri thức và phân tích sản phẩm bằng AI.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="rounded-xl border border-white/10 bg-[#161d2b] p-4">
              <div className="mb-2 flex items-center justify-between">
                <Icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="mt-0.5 text-xs text-slate-500">{s.label}</div>
            </div>
          )
        })}
      </div>

      {/* Shortcuts */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {shortcuts.map((s) => {
          const Icon = s.icon
          return (
            <Link key={s.label} href={s.href} className="group flex items-center gap-3 rounded-xl border border-white/10 bg-[#161d2b] p-4 transition-colors hover:border-brand-red">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-red/15"><Icon className="h-4 w-4 text-brand-red" /></span>
              <span className="flex-1 text-sm font-medium text-slate-200 group-hover:text-white">{s.label}</span>
              <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400" />
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Recent content */}
        <div className="rounded-2xl border border-white/10 bg-[#161d2b] p-5 lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><Wand2 className="h-4 w-4" /> Nội dung gần đây</h2>
          {recentContent.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Chưa có nội dung. <Link href="/admin/content/studio" className="text-brand-red hover:underline">Tạo ngay</Link></p>
          ) : (
            <div className="space-y-1.5">
              {recentContent.map((c) => (
                <div key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/[0.03]">
                  <span className="rounded-full bg-brand-red/15 px-2 py-0.5 text-[11px] font-medium text-brand-red">{channelLabel(c.channel)}</span>
                  <span className="flex-1 truncate text-slate-300">{c.title}</span>
                  <span className="text-[11px] text-slate-600">{new Date(c.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top channels */}
        <div className="rounded-2xl border border-white/10 bg-[#161d2b] p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><Boxes className="h-4 w-4" /> Kênh được dùng nhiều</h2>
          {topChannels.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Chưa có dữ liệu.</p>
          ) : (
            <div className="space-y-2">
              {topChannels.map((c) => (
                <div key={c.channel} className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">{channelLabel(c.channel)}</span>
                  <span className="font-semibold text-white">{c._count._all}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent knowledge */}
      <div className="rounded-2xl border border-white/10 bg-[#161d2b] p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><BookOpen className="h-4 w-4" /> Bài tri thức gần đây</h2>
        {recentArticles.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">Chưa có bài. <Link href="/admin/knowledge" className="text-brand-red hover:underline">Thêm bài</Link></p>
        ) : (
          <div className="space-y-1.5">
            {recentArticles.map((a) => (
              <Link key={a.id} href="/admin/knowledge" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/[0.03]">
                <span className="flex-1 truncate text-slate-300">{a.title}</span>
                <span className="text-[11px] text-slate-600">{new Date(a.updatedAt).toLocaleDateString('vi-VN')}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
