'use client'

import { useEffect, useState } from 'react'
import { Save, Eye, EyeOff, Plug, CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react'

type Status = { pageId: string; hasToken: boolean; enabled: boolean }

export function FacebookSettingsClient() {
  const [pageId, setPageId] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [hasToken, setHasToken] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    fetch('/api/v1/admin/settings/facebook')
      .then((r) => r.json())
      .then((d: Status) => { setPageId(d.pageId ?? ''); setHasToken(!!d.hasToken); setEnabled(!!d.enabled) })
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true); setResult(null)
    const res = await fetch('/api/v1/admin/settings/facebook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pageId, accessToken: accessToken || undefined, enabled }),
    })
    const d = await res.json()
    setSaving(false)
    if (d.success) {
      if (accessToken) setHasToken(true)
      setAccessToken('')
      if (d.test) setResult(d.test.ok ? { ok: true, msg: `Đã lưu. Kết nối OK — Page: ${d.test.pageName}` } : { ok: false, msg: `Đã lưu nhưng kết nối lỗi: ${d.test.error}` })
      else setResult({ ok: true, msg: 'Đã lưu cấu hình.' })
    } else {
      setResult({ ok: false, msg: d.error ?? 'Lưu thất bại' })
    }
  }

  async function test() {
    setTesting(true); setResult(null)
    const res = await fetch('/api/v1/admin/settings/facebook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'test' }),
    })
    const d = await res.json()
    setTesting(false)
    setResult(d.ok ? { ok: true, msg: `Kết nối OK — Page: ${d.pageName}` } : { ok: false, msg: d.error ?? 'Kết nối lỗi' })
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-gray-400"><Loader2 className="h-6 w-6 animate-spin" /></div>

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1877F2] text-white text-sm font-black">f</span>
          Facebook Marketing
        </h1>
        <p className="mt-1 text-sm text-gray-500">Kết nối Fanpage để đăng bài tự động từ Japan VIP.</p>
      </div>

      <div className="rounded-xl border bg-white p-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Facebook Page ID</label>
          <input
            value={pageId} onChange={(e) => setPageId(e.target.value)} placeholder="vd: 100xxxxxxxxxxx"
            className="w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Page Access Token {hasToken && <span className="text-xs text-emerald-600">(đã lưu — để trống nếu không đổi)</span>}
          </label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'} value={accessToken} onChange={(e) => setAccessToken(e.target.value)}
              placeholder={hasToken ? '••••••••••••••••' : 'Dán Page Access Token (long-lived)'}
              className="w-full rounded-lg border px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
            />
            <button type="button" onClick={() => setShowToken((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <label className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-gray-800">Bật đăng tự động</p>
            <p className="text-xs text-gray-500">Tắt sẽ ngừng mọi bài đăng theo lịch</p>
          </div>
          <button type="button" onClick={() => setEnabled((v) => !v)} className={`relative h-6 w-11 rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </label>

        {result && (
          <div className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${result.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {result.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />}
            {result.msg}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-lg bg-brand-red px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-red-dark disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Lưu
          </button>
          <button onClick={test} disabled={testing || !pageId || !hasToken} className="flex items-center gap-2 rounded-lg border-2 border-solid border-brand-red bg-white px-5 py-2.5 text-sm font-semibold text-brand-red hover:bg-brand-red hover:text-white transition-colors disabled:opacity-50">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />} Kiểm tra kết nối
          </button>
        </div>
      </div>

      {/* Hướng dẫn lấy token */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5 text-sm text-gray-700">
        <p className="mb-2 font-semibold text-gray-800">Cách lấy Page ID + Access Token</p>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>Tạo app tại <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">developers.facebook.com/apps <ExternalLink className="h-3 w-3" /></a> (loại Business).</li>
          <li>Thêm sản phẩm <b>Facebook Login</b> + quyền <code className="rounded bg-white px-1">pages_manage_posts</code>, <code className="rounded bg-white px-1">pages_read_engagement</code>.</li>
          <li>Vào <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">Graph API Explorer <ExternalLink className="h-3 w-3" /></a> → chọn app → Get <b>Page Access Token</b> → chọn Fanpage Japan VIP.</li>
          <li>Đổi sang <b>token dài hạn</b> (long-lived, ~60 ngày) hoặc token vĩnh viễn qua System User.</li>
          <li><b>Page ID</b>: lấy ở Graph API Explorer (<code className="rounded bg-white px-1">/me?fields=id,name</code> khi đang chọn page), hoặc trong Cài đặt trang.</li>
        </ol>
        <p className="mt-2 text-xs text-gray-500">Token được lưu mã hoá. Vì đăng lên chính page của bạn (bạn là admin) nên không cần Meta App Review.</p>
      </div>
    </div>
  )
}
