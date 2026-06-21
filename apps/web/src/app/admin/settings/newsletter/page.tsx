'use client'

import { useEffect, useState } from 'react'
import { Send, Users, Loader2, CheckCircle2 } from 'lucide-react'

export default function NewsletterAdminPage() {
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [raw, setRaw] = useState(false)
  const [recipients, setRecipients] = useState<number | null>(null)
  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState<{ sent: number } | null>(null)
  const [done, setDone] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/v1/admin/newsletter').then(r => r.json()).then(d => setRecipients(d?.data?.recipients ?? 0)).catch(() => {})
  }, [])

  async function send() {
    if (!subject.trim() || !bodyHtml.trim()) { alert('Nhập tiêu đề và nội dung'); return }
    if (!confirm(`Gửi email "${subject}" cho ${recipients ?? '?'} khách đã đồng ý nhận tin?`)) return
    setSending(true); setDone(null); setProgress({ sent: 0 })
    try {
      let campaignId: string | undefined
      let total = 0
      // Gọi lặp tới khi gửi hết (mỗi lần tối đa 40)
      for (let i = 0; i < 200; i++) {
        const res = await fetch('/api/v1/admin/newsletter', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject, bodyHtml, campaignId, raw }),
        })
        const data = await res.json().catch(() => null)
        if (!data?.success) { alert(data?.error || `Lỗi gửi (HTTP ${res.status})`); break }
        campaignId = data.data.campaignId
        total += data.data.sent
        setProgress({ sent: total })
        if (!data.data.hasMore) break
      }
      setDone(total)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Gửi Email Hàng Loạt (Newsletter)</h1>
        <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> {recipients === null ? 'Đang đếm...' : `${recipients} khách đã đồng ý nhận tin`}
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-gray-700 bg-gray-800/60 p-5">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Tiêu đề email *</label>
          <input value={subject} onChange={e => setSubject(e.target.value)}
            placeholder="VD: 🎌 Ưu đãi cuối tuần — Gia dụng Nhật giảm sốc"
            className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Kiểu nội dung</label>
          <div className="flex gap-2 mb-3">
            {([
              { v: false, label: '📝 Văn bản (tự bọc layout)' },
              { v: true, label: '🎨 HTML đầy đủ (dán từ builder)' },
            ] as const).map(o => (
              <button key={String(o.v)} type="button" onClick={() => setRaw(o.v)}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                  raw === o.v ? 'border-red-500 bg-red-500/10 text-red-400' : 'border-gray-700 bg-gray-800 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                }`}>{o.label}</button>
            ))}
          </div>

          <label className="text-xs text-gray-400 mb-1 block">
            Nội dung *{' '}
            <span className="text-gray-600">
              {raw ? '(dán nguyên HTML email từ Stripo/BeeFree/Canva…)' : '(HTML cơ bản: <b>, <a href>, <br/>, <p>…)'}
            </span>
          </label>
          <textarea value={bodyHtml} onChange={e => setBodyHtml(e.target.value)} rows={raw ? 14 : 10}
            placeholder={raw ? '<!DOCTYPE html><html>… dán toàn bộ HTML email thiết kế sẵn vào đây …</html>' : 'Chào bạn,\n\nTuần này Japan VIP có nhiều sản phẩm mới về...\n\n<b>Ưu đãi đặc biệt</b> dành cho bạn.'}
            className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-red-500 resize-none" />
          {raw ? (
            <p className="mt-1 text-[11px] text-gray-600">Gửi <strong className="text-gray-400">nguyên HTML</strong> bạn dán (không bọc layout JapanVIP). Dùng placeholder <code className="text-amber-400">{'{{ten}}'}</code> để chèn tên khách, <code className="text-amber-400">{'{{unsubscribe}}'}</code> cho link hủy đăng ký (nếu thiếu, hệ thống tự thêm 1 dòng hủy ở cuối).</p>
          ) : (
            <p className="mt-1 text-[11px] text-gray-600">Email tự động có header/footer Japan VIP + lời chào tên khách + link hủy đăng ký. Bạn chỉ cần viết phần thân.</p>
          )}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button onClick={send} disabled={sending}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">
            {sending ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang gửi {progress?.sent ?? 0}...</> : <><Send className="h-4 w-4" /> Gửi cho tất cả</>}
          </button>
          {done !== null && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-400 font-medium">
              <CheckCircle2 className="h-4 w-4" /> Đã gửi xong {done} email
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-amber-700/40 bg-amber-900/15 px-4 py-3 text-xs text-amber-300/90">
        ⚠️ Chỉ gửi cho khách đã đồng ý nhận tin (opt-out tôn trọng). Mỗi lần gửi tối đa 40 email rồi tự gửi tiếp. Danh sách rất lớn (vài trăm+) nên cân nhắc nâng Vercel Pro / dịch vụ gửi email chuyên dụng để nhanh & ổn định hơn.
      </div>
    </div>
  )
}
