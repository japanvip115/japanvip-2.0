'use client'

import { useState, useEffect } from 'react'
import { Copy, RefreshCw, Eye, EyeOff, Key } from 'lucide-react'

export default function ApiKeysPage() {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/v1/admin/settings/api-keys')
      .then(r => r.json())
      .then(d => { setApiKey(d.key); setLoading(false) })
  }, [])

  async function regenerate() {
    if (!confirm('Tạo key mới sẽ huỷ key cũ — máy tính B cần cập nhật lại. Tiếp tục?')) return
    setRegenerating(true)
    const res = await fetch('/api/v1/admin/settings/api-keys', { method: 'POST' })
    const d = await res.json()
    setApiKey(d.key)
    setVisible(true)
    setRegenerating(false)
  }

  function copy() {
    if (!apiKey) return
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const masked = apiKey ? apiKey.slice(0, 10) + '•'.repeat(40) : ''

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Key className="h-5 w-5 text-red-400" /> API Key — Content Writer
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Dùng key này để Claude trên máy tính khác gọi API viết nội dung.
        </p>
      </div>

      <div className="rounded-xl border border-gray-700 bg-gray-900 p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Bearer Token</p>

        {loading ? (
          <div className="h-10 animate-pulse rounded-lg bg-gray-800" />
        ) : (
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-gray-800 px-4 py-2.5 font-mono text-xs text-green-400 break-all">
              {visible ? apiKey : masked}
            </code>
            <button onClick={() => setVisible(v => !v)} className="shrink-0 rounded-lg border border-gray-700 p-2 text-gray-400 hover:text-white transition">
              {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button onClick={copy} className="shrink-0 rounded-lg border border-gray-700 p-2 text-gray-400 hover:text-white transition">
              <Copy className="h-4 w-4" />
            </button>
          </div>
        )}

        {copied && <p className="text-xs text-green-400">Đã copy!</p>}

        <button
          onClick={regenerate}
          disabled={regenerating}
          className="flex items-center gap-2 rounded-lg border border-red-700/50 bg-red-900/20 px-4 py-2 text-sm text-red-400 hover:bg-red-900/40 transition disabled:opacity-40"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? 'animate-spin' : ''}`} />
          {regenerating ? 'Đang tạo...' : 'Tạo key mới'}
        </button>
      </div>

      <div className="rounded-xl border border-gray-700 bg-gray-900 p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Hướng dẫn dùng (Claude máy B)</p>
        <p className="text-xs text-gray-400">Trong <code className="text-gray-300">.env.local</code> của máy B, thêm:</p>
        <code className="block rounded-lg bg-gray-800 px-4 py-3 text-xs text-yellow-300 whitespace-pre">
{`JAPANVIP_API_KEY=<key ở trên>
JAPANVIP_API_URL=https://japanvip.vn`}
        </code>
        <p className="text-xs text-gray-400">Rồi gọi API:</p>
        <code className="block rounded-lg bg-gray-800 px-4 py-3 text-xs text-blue-300 whitespace-pre">
{`Authorization: Bearer <key>`}
        </code>
      </div>
    </div>
  )
}
