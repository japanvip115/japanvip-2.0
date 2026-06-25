'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'

type Post = {
  id: string
  title: string
  slug: string
  status: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED'
  createdAt: Date
  category: { name: string } | null
  author: { email: string; profile: { fullName: string | null } | null }
}

const STATUS_COLORS: Record<Post['status'], string> = {
  PUBLISHED: 'bg-green-500/15 text-green-400 ring-1 ring-inset ring-green-500/20',
  DRAFT: 'bg-gray-500/15 text-gray-400 ring-1 ring-inset ring-gray-500/20',
  ARCHIVED: 'bg-yellow-500/15 text-yellow-400 ring-1 ring-inset ring-yellow-500/20',
}
const STATUS_LABELS: Record<Post['status'], string> = {
  PUBLISHED: 'Đã xuất bản',
  DRAFT: 'Bản nháp',
  ARCHIVED: 'Lưu trữ',
}

export function BlogTable({ posts }: { posts: Post[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)

  const allChecked = posts.length > 0 && selected.size === posts.length
  const someChecked = selected.size > 0 && selected.size < posts.length

  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(posts.map((p) => p.id)))
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleDelete() {
    if (!confirming) { setConfirming(true); return }
    setConfirming(false)
    startTransition(async () => {
      await fetch('/api/v1/admin/content/blog', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selected] }),
      })
      setSelected(new Set())
      router.refresh()
    })
  }

  return (
    <>
      {/* Bulk toolbar */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-red-800/50 bg-red-950/40 px-4 py-2.5">
          <span className="text-sm text-red-300 font-medium">Đã chọn {selected.size} bài</span>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Bỏ chọn
          </button>
          <div className="ml-auto flex items-center gap-2">
            {confirming && (
              <span className="text-xs text-red-400">Xác nhận xoá {selected.size} bài?</span>
            )}
            <button
              onClick={handleDelete}
              disabled={pending}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50 ${confirming ? 'bg-red-600 hover:bg-red-500' : 'bg-gray-700 hover:bg-red-700'}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {confirming ? 'Xác nhận xoá' : 'Xoá hàng loạt'}
            </button>
            {confirming && (
              <button
                onClick={() => setConfirming(false)}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                Huỷ
              </button>
            )}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800/60">
        <table className="w-full text-sm">
          <thead className="bg-gray-900/60">
            <tr className="border-b border-gray-700 text-left">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => { if (el) el.indeterminate = someChecked }}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-gray-600 bg-gray-700 accent-red-500 cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Tiêu đề</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Danh mục</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Tác giả</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Trạng thái</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Ngày tạo</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {posts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                  Chưa có bài viết nào.{' '}
                  <Link href="/admin/content/blog/new" className="text-red-400 hover:underline">Viết ngay</Link>
                </td>
              </tr>
            )}
            {posts.map((post) => (
              <tr
                key={post.id}
                className={`transition-colors ${selected.has(post.id) ? 'bg-red-950/20' : 'hover:bg-gray-700/30'}`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(post.id)}
                    onChange={() => toggle(post.id)}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-700 accent-red-500 cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-300 truncate">{post.title}</span>
                    {post.status === 'PUBLISHED' && (
                      <a
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        title="Xem trang"
                      >
                        ↗
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-300">{post.category?.name ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-300">
                  {post.author.profile?.fullName ?? post.author.email}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[post.status]}`}>
                    {STATUS_LABELS[post.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/content/blog/${post.id}`}
                    className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <Pencil className="h-3 w-3" /> Sửa
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
