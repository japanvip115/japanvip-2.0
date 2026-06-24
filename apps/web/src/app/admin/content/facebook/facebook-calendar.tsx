'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react'

type Post = {
  id: string; message: string; imageUrl: string | null; angle: string
  status: string; scheduledAt: string | null; publishedAt: string | null; createdAt: string
}

const STATUS_DOT: Record<string, string> = {
  SCHEDULED: 'bg-blue-400',
  PUBLISHED: 'bg-emerald-400',
  DRAFT: 'bg-slate-400',
  FAILED: 'bg-red-400',
}
const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

// Ngày hiệu lực để xếp lên lịch: SCHEDULED→scheduledAt, PUBLISHED→publishedAt, còn lại→createdAt
function effectiveDate(p: Post): Date {
  const s = p.status === 'SCHEDULED' ? p.scheduledAt : p.status === 'PUBLISHED' ? p.publishedAt : p.createdAt
  return new Date(s ?? p.createdAt)
}
function ymd(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export function FacebookCalendar({ posts, onSelect }: { posts: Post[]; onSelect: (id: string) => void }) {
  const today = new Date()
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  const byDay = useMemo(() => {
    const map = new Map<string, Post[]>()
    for (const p of posts) {
      const k = ymd(effectiveDate(p))
      const arr = map.get(k) ?? []
      arr.push(p)
      map.set(k, arr)
    }
    return map
  }, [posts])

  // Lưới: bắt đầu từ Thứ 2 của tuần chứa ngày 1
  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const offset = (first.getDay() + 6) % 7 // 0=T2
    const start = new Date(first)
    start.setDate(first.getDate() - offset)
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [cursor])

  const monthLabel = `Tháng ${cursor.getMonth() + 1}, ${cursor.getFullYear()}`

  return (
    <div className="rounded-2xl border border-white/10 bg-[#161d2b] p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-bold text-white">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="rounded-lg border border-white/10 p-1.5 text-slate-300 hover:bg-white/5"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/5">Hôm nay</button>
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="rounded-lg border border-white/10 p-1.5 text-slate-300 hover:bg-white/5"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-slate-400">
        {WEEKDAYS.map((w) => <div key={w}>{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === cursor.getMonth()
          const isToday = ymd(d) === ymd(today)
          const dayPosts = byDay.get(ymd(d)) ?? []
          return (
            <div key={i}
              className={`min-h-[78px] rounded-lg border p-1.5 ${inMonth ? 'border-white/10 bg-white/[0.02]' : 'border-transparent bg-transparent opacity-40'} ${isToday ? 'ring-1 ring-brand-red' : ''}`}>
              <div className={`mb-1 text-right text-[11px] ${isToday ? 'font-bold text-brand-red' : 'text-slate-400'}`}>{d.getDate()}</div>
              <div className="space-y-0.5">
                {dayPosts.slice(0, 3).map((p) => (
                  <button key={p.id} onClick={() => onSelect(p.id)}
                    className="flex w-full items-center gap-1 rounded bg-white/5 px-1 py-0.5 text-left text-[10px] text-slate-200 hover:bg-white/10">
                    <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${STATUS_DOT[p.status] ?? 'bg-slate-400'}`} />
                    {p.imageUrl && <ImageIcon className="h-2.5 w-2.5 flex-shrink-0 text-slate-400" />}
                    <span className="truncate">{p.message.slice(0, 30) || '(trống)'}</span>
                  </button>
                ))}
                {dayPosts.length > 3 && <p className="px-1 text-[10px] text-slate-400">+{dayPosts.length - 3} bài</p>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-400" /> Đã lên lịch</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Đã đăng</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-400" /> Nháp</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" /> Lỗi</span>
      </div>
    </div>
  )
}
