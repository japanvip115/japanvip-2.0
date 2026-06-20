'use client'

import { useEffect, useState } from 'react'
import { Eye, EyeOff, Save, Trash2, ShieldCheck, ExternalLink, ChevronDown, ChevronUp, Plus, X } from 'lucide-react'
import Link from 'next/link'

function ClaudeCodeCard() {
  const [status, setStatus] = useState<{ available: boolean; version: string | null } | null>(null)

  useEffect(() => {
    fetch('/api/v1/admin/ai/claude-code-status')
      .then(r => r.json())
      .then(setStatus)
      .catch(() => setStatus({ available: false, version: null }))
  }, [])

  return (
    <div className={`rounded-xl border ${status?.available ? 'border-green-500/40 bg-green-900/10' : 'border-gray-600/50 bg-gray-800/30'} overflow-hidden`}>
      <div className="px-5 py-4 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🎌</span>
            <span className="text-sm font-bold text-gray-100">Claude Code (Subscription)</span>
            <span className="rounded-full bg-green-500/20 border border-green-500/30 px-2 py-0.5 text-[10px] font-bold text-green-400">Miễn phí</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Dùng tài khoản <strong className="text-white">Claude.ai</strong> (đăng nhập bằng Google) làm AI engine — không cần API key riêng, không tốn credit Anthropic. Claude Code phải được cài sẵn trên máy server.
          </p>
        </div>
        <div className="shrink-0">
          {status === null ? (
            <span className="rounded-full bg-gray-700 border border-gray-600 px-3 py-1 text-xs text-gray-400 animate-pulse">Đang kiểm tra...</span>
          ) : status.available ? (
            <span className="flex items-center gap-1.5 rounded-full bg-green-500/20 border border-green-500/40 px-3 py-1 text-xs text-green-400 font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" />
              Đã kết nối
            </span>
          ) : (
            <span className="rounded-full bg-red-500/10 border border-red-500/30 px-3 py-1 text-xs text-red-400 font-semibold">
              Chưa cài đặt
            </span>
          )}
        </div>
      </div>

      {status?.available && (
        <div className="px-5 pb-4">
          <div className="rounded-lg bg-gray-900/60 border border-green-500/20 px-3 py-2.5 flex items-center gap-3">
            <span className="text-green-400 text-lg">✓</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-green-300 font-semibold">Claude Code đang hoạt động</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{status.version} · Xác thực qua Google OAuth · Sẵn sàng dùng trong AI Writer</p>
            </div>
          </div>
          <p className="text-[11px] text-gray-600 mt-2">
            ⚠️ Khi deploy lên VPS: cần chạy <code className="bg-gray-800 px-1 rounded text-gray-400">claude login</code> trên máy chủ để xác thực Google.
          </p>
        </div>
      )}

      {status && !status.available && (
        <div className="px-5 pb-4 space-y-2">
          <div className="rounded-lg bg-gray-900/60 border border-gray-700 px-3 py-2.5 text-xs text-gray-400 space-y-1.5">
            <p className="font-semibold text-gray-300">Cách cài đặt Claude Code:</p>
            <p><code className="bg-gray-800 px-1 rounded text-orange-300">npm install -g @anthropic-ai/claude-code</code></p>
            <p>Sau đó chạy <code className="bg-gray-800 px-1 rounded text-orange-300">claude login</code> và đăng nhập bằng Google.</p>
          </div>
        </div>
      )}
    </div>
  )
}

type ProviderStatus = { id: string; hasKey: boolean; masked: string | null }
type CustomProvider = { id: string; label: string; docsUrl: string; hasKey: boolean; masked: string | null }

type ProviderDef = {
  id: string
  label: string
  desc: string
  docsUrl: string
  placeholder: string
  badge: string
}

const PROVIDER_GROUPS: { title: string; icon: string; color: string; providers: ProviderDef[] }[] = [
  {
    title: 'Text & Content AI', icon: '✍️', color: 'border-purple-700/50 bg-purple-900/10',
    providers: [
      { id: 'anthropic', label: 'Anthropic Claude', badge: 'Khuyên dùng', desc: 'Tốt nhất cho viết content tiếng Việt, reasoning sâu. Dùng trong AI Content Writer.', docsUrl: 'https://console.anthropic.com/settings/keys', placeholder: 'sk-ant-api03-...' },
      { id: 'openai',    label: 'OpenAI GPT-4o',    badge: 'Phổ biến',    desc: 'Hỗ trợ vision (đưa ảnh vào → AI mô tả). Dùng để phân tích catalog Nhật.', docsUrl: 'https://platform.openai.com/api-keys', placeholder: 'sk-proj-...' },
      { id: 'gemini',    label: 'Google Gemini',     badge: 'Context lớn', desc: 'Context window 1M token. Tốt cho xử lý catalog dài hoặc nhiều sản phẩm cùng lúc.', docsUrl: 'https://aistudio.google.com/app/apikey', placeholder: 'AIzaSy...' },
    ],
  },
  {
    title: 'Image Generation AI', icon: '🎨', color: 'border-blue-700/50 bg-blue-900/10',
    providers: [
      { id: 'stability', label: 'Stability AI',  badge: 'SDXL',       desc: 'Tạo ảnh sản phẩm, lifestyle shot, background từ text prompt. API giá rẻ.', docsUrl: 'https://platform.stability.ai/account/keys', placeholder: 'sk-...' },
      { id: 'ideogram',  label: 'Ideogram',      badge: 'Text in img', desc: 'Xuất sắc với ảnh chứa chữ Việt/Nhật. Dùng làm banner, thumbnail blog.', docsUrl: 'https://ideogram.ai/manage-api', placeholder: 'YOUR_API_KEY' },
      { id: 'replicate', label: 'Replicate',     badge: 'Đa mô hình',  desc: 'Truy cập hàng nghìn model (Flux, SDXL, Sora...). Tính phí theo giây GPU.', docsUrl: 'https://replicate.com/account/api-tokens', placeholder: 'r8_...' },
    ],
  },
  {
    title: 'Video Generation AI', icon: '🎬', color: 'border-green-700/50 bg-green-900/10',
    providers: [
      { id: 'runway', label: 'RunwayML Gen-3', badge: 'Chất lượng cao', desc: 'Tạo video từ ảnh sản phẩm. Dùng cho quảng cáo, reel mạng xã hội.', docsUrl: 'https://app.runwayml.com/settings', placeholder: 'YOUR_API_KEY' },
      { id: 'kling',  label: 'Kling AI',       badge: 'Giá tốt',       desc: 'Video AI từ Trung Quốc, chất lượng cao, giá thấp hơn RunwayML. Hỗ trợ 4K.', docsUrl: 'https://klingai.com', placeholder: 'YOUR_API_KEY' },
    ],
  },
  {
    title: 'Social & Automation AI', icon: '📡', color: 'border-orange-700/50 bg-orange-900/10',
    providers: [
      { id: 'postbridge', label: 'PostBridge', badge: 'Social posting', desc: 'Tự động đăng bài lên Facebook, Instagram, TikTok, Zalo... từ một nơi. Tích hợp AI caption.', docsUrl: 'https://post-bridge.com', placeholder: 'YOUR_API_KEY' },
      { id: 'fal',        label: 'fal.ai',     badge: 'Fast inference', desc: 'Chạy model AI (Flux, Stable Video, Whisper...) cực nhanh. Giá rẻ, latency thấp hơn Replicate.', docsUrl: 'https://fal.ai/dashboard/keys', placeholder: 'fal_key_...' },
    ],
  },
]

export function AiKeysClient() {
  const [statuses, setStatuses] = useState<Record<string, ProviderStatus>>({})
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [showInputs, setShowInputs] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  // Custom providers
  const [customProviders, setCustomProviders] = useState<CustomProvider[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newDocsUrl, setNewDocsUrl] = useState('')
  const [newKey, setNewKey] = useState('')
  const [addingCustom, setAddingCustom] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({})
  const [customShowInputs, setCustomShowInputs] = useState<Record<string, boolean>>({})
  const [customSaving, setCustomSaving] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({})

  useEffect(() => {
    fetch('/api/v1/admin/settings/ai-keys')
      .then(r => r.json())
      .then(d => {
        const map: Record<string, ProviderStatus> = {}
        for (const p of (d.providers ?? [])) map[p.id] = p
        setStatuses(map)
        setCustomProviders(d.custom ?? [])
      })
  }, [])

  async function save(providerId: string) {
    const key = inputs[providerId]?.trim()
    if (!key) return
    setSaving(v => ({ ...v, [providerId]: 'saving' }))
    setErrors(v => ({ ...v, [providerId]: '' }))

    const res = await fetch('/api/v1/admin/settings/ai-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId, apiKey: key }),
    })
    const data = await res.json()

    if (data.success) {
      setSaving(v => ({ ...v, [providerId]: 'saved' }))
      setStatuses(v => ({ ...v, [providerId]: { id: providerId, hasKey: true, masked: `${key.slice(0, 10)}${'•'.repeat(18)}` } }))
      setInputs(v => ({ ...v, [providerId]: '' }))
    } else {
      setSaving(v => ({ ...v, [providerId]: 'error' }))
      setErrors(v => ({ ...v, [providerId]: data.error ?? 'Lỗi không xác định' }))
    }
  }

  async function remove(providerId: string) {
    if (!confirm('Xoá API Key này?')) return
    await fetch('/api/v1/admin/settings/ai-keys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId }),
    })
    setStatuses(v => ({ ...v, [providerId]: { id: providerId, hasKey: false, masked: null } }))
    setSaving(v => ({ ...v, [providerId]: 'idle' }))
  }

  async function addCustomProvider() {
    if (!newLabel.trim() || !newKey.trim()) return
    setAddingCustom('saving')
    const id = newLabel.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
    const res = await fetch('/api/v1/admin/settings/ai-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ custom: { id, label: newLabel.trim(), docsUrl: newDocsUrl.trim(), apiKey: newKey.trim() } }),
    })
    const data = await res.json()
    if (data.success) {
      setCustomProviders(prev => [...prev.filter(p => p.id !== (data.id ?? id)), {
        id: data.id ?? id, label: newLabel.trim(), docsUrl: newDocsUrl.trim(),
        hasKey: true, masked: `${newKey.slice(0, 10)}${'•'.repeat(18)}`,
      }])
      setNewLabel(''); setNewDocsUrl(''); setNewKey('')
      setShowAddForm(false)
      setAddingCustom('idle')
    } else {
      setAddingCustom('error')
    }
  }

  async function saveCustomKey(p: CustomProvider) {
    const key = customInputs[p.id]?.trim()
    if (!key) return
    setCustomSaving(v => ({ ...v, [p.id]: 'saving' }))
    const res = await fetch('/api/v1/admin/settings/ai-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ custom: { id: p.id, label: p.label, docsUrl: p.docsUrl, apiKey: key } }),
    })
    const data = await res.json()
    if (data.success) {
      setCustomSaving(v => ({ ...v, [p.id]: 'saved' }))
      setCustomProviders(prev => prev.map(cp => cp.id === p.id ? { ...cp, hasKey: true, masked: `${key.slice(0, 10)}${'•'.repeat(18)}` } : cp))
      setCustomInputs(v => ({ ...v, [p.id]: '' }))
    } else {
      setCustomSaving(v => ({ ...v, [p.id]: 'error' }))
    }
  }

  async function removeCustom(id: string) {
    if (!confirm('Xoá API Key này?')) return
    await fetch('/api/v1/admin/settings/ai-keys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customId: id }),
    })
    setCustomProviders(prev => prev.filter(p => p.id !== id))
  }

  const configuredCount = Object.values(statuses).filter(s => s.hasKey).length + customProviders.filter(p => p.hasKey).length

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">AI API Keys</h1>
          <p className="mt-1 text-sm text-gray-400">
            Tất cả key được mã hoá <strong className="text-gray-200">AES-256-GCM</strong> trước khi lưu DB.
          </p>
        </div>
        <div className="shrink-0 rounded-xl bg-gray-800 border border-gray-700 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-white">{configuredCount}<span className="text-gray-500 text-lg">/{Object.keys(statuses).length || 8}</span></p>
          <p className="text-xs text-gray-500 mt-0.5">Provider đã cấu hình</p>
        </div>
      </div>

      {/* Claude Code (subscription) */}
      <ClaudeCodeCard />

      {/* Provider groups */}
      {PROVIDER_GROUPS.map(group => (
        <div key={group.title} className={`rounded-xl border ${group.color} overflow-hidden`}>
          {/* Group header */}
          <button
            onClick={() => setCollapsed(v => ({ ...v, [group.title]: !v[group.title] }))}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{group.icon}</span>
              <span className="font-semibold text-gray-200 text-sm">{group.title}</span>
              <span className="text-xs text-gray-500">
                ({group.providers.filter(p => statuses[p.id]?.hasKey).length}/{group.providers.length} đã cấu hình)
              </span>
            </div>
            {collapsed[group.title]
              ? <ChevronDown className="h-4 w-4 text-gray-500" />
              : <ChevronUp className="h-4 w-4 text-gray-500" />
            }
          </button>

          {/* Provider cards */}
          {!collapsed[group.title] && (
            <div className="divide-y divide-gray-800/60">
              {group.providers.map(p => {
                const status = statuses[p.id]
                const st = saving[p.id] ?? 'idle'

                return (
                  <div key={p.id} className="px-5 py-4 space-y-3 bg-gray-900/30">
                    {/* Provider header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-100">{p.label}</span>
                          <span className="rounded-full bg-gray-700 px-2 py-0.5 text-[10px] font-medium text-gray-300">{p.badge}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{p.desc}</p>
                      </div>
                      {status?.hasKey ? (
                        <span className="shrink-0 flex items-center gap-1 rounded-full bg-green-500/20 border border-green-500/30 px-2 py-0.5 text-xs text-green-400 font-medium">
                          <ShieldCheck className="h-3 w-3" /> Đã cấu hình
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-gray-800 border border-gray-700 px-2 py-0.5 text-xs text-gray-500">Chưa có key</span>
                      )}
                    </div>

                    {/* Masked key display */}
                    {status?.hasKey && status.masked && (
                      <div className="flex items-center gap-2 rounded-lg bg-gray-900 border border-gray-700/50 px-3 py-2">
                        <ShieldCheck className="h-3.5 w-3.5 text-green-400 shrink-0" />
                        <code className="text-xs text-green-300 font-mono tracking-wider flex-1 truncate">{status.masked}</code>
                        <button onClick={() => remove(p.id)} className="text-xs text-red-400 hover:text-red-300 transition flex items-center gap-1 shrink-0">
                          <Trash2 className="h-3 w-3" /> Xoá
                        </button>
                      </div>
                    )}

                    {/* Input row */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showInputs[p.id] ? 'text' : 'password'}
                          value={inputs[p.id] ?? ''}
                          onChange={e => { setInputs(v => ({ ...v, [p.id]: e.target.value })); setSaving(v => ({ ...v, [p.id]: 'idle' })) }}
                          onKeyDown={e => e.key === 'Enter' && save(p.id)}
                          placeholder={p.placeholder}
                          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 pr-9 font-mono text-xs text-white placeholder-gray-700 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowInputs(v => ({ ...v, [p.id]: !v[p.id] }))}
                          className="absolute right-2.5 top-2.5 text-gray-600 hover:text-gray-400 transition"
                        >
                          {showInputs[p.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>

                      <button
                        onClick={() => save(p.id)}
                        disabled={!inputs[p.id]?.trim() || st === 'saving'}
                        className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition disabled:opacity-40 ${
                          st === 'saved' ? 'bg-green-600 text-white' :
                          st === 'error' ? 'bg-red-600 text-white' :
                          'bg-purple-600 text-white hover:bg-purple-700'
                        }`}
                      >
                        <Save className="h-3.5 w-3.5" />
                        {st === 'saving' ? 'Đang lưu...' : st === 'saved' ? '✓ Đã lưu' : st === 'error' ? '✕ Lỗi' : 'Lưu'}
                      </button>

                      <a
                        href={p.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Lấy API Key"
                        className="shrink-0 flex items-center justify-center h-8 w-8 rounded-lg border border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-500 transition"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>

                    {errors[p.id] && (
                      <p className="text-xs text-red-400">✕ {errors[p.id]}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}

      {/* ── Custom providers ── */}
      <div className="rounded-xl border border-gray-600/50 bg-gray-800/30 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-700/50">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔧</span>
            <span className="font-semibold text-gray-200 text-sm">Provider tùy chỉnh</span>
            <span className="text-xs text-gray-500">({customProviders.filter(p => p.hasKey).length}/{customProviders.length} đã cấu hình)</span>
          </div>
          <button
            onClick={() => setShowAddForm(v => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-600 bg-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:border-gray-500 transition"
          >
            {showAddForm ? <><X className="h-3.5 w-3.5" /> Đóng</> : <><Plus className="h-3.5 w-3.5" /> Thêm provider</>}
          </button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="px-5 py-4 border-b border-gray-700/50 bg-gray-900/40 space-y-3">
            <p className="text-xs text-gray-400 font-semibold">Thêm API provider mới</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Tên provider *</label>
                <input
                  type="text"
                  placeholder="VD: ElevenLabs, DeepSeek, xAI..."
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">URL docs / lấy key</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={newDocsUrl}
                  onChange={e => setNewDocsUrl(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-purple-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">API Key *</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Dán API key vào đây..."
                  value={newKey}
                  onChange={e => setNewKey(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomProvider()}
                  className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 font-mono text-xs text-white placeholder-gray-600 outline-none focus:border-purple-500"
                />
                <button
                  onClick={addCustomProvider}
                  disabled={!newLabel.trim() || !newKey.trim() || addingCustom === 'saving'}
                  className={`shrink-0 flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition disabled:opacity-40 ${
                    addingCustom === 'saved' ? 'bg-green-600 text-white' :
                    addingCustom === 'error' ? 'bg-red-600 text-white' :
                    'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  <Save className="h-3.5 w-3.5" />
                  {addingCustom === 'saving' ? 'Đang lưu...' : addingCustom === 'error' ? '✕ Lỗi' : 'Lưu'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom provider list */}
        {customProviders.length === 0 && !showAddForm && (
          <div className="px-5 py-6 text-center text-xs text-gray-600">
            Chưa có provider tùy chỉnh. Nhấn <strong className="text-gray-400">+ Thêm provider</strong> để bắt đầu.
          </div>
        )}

        <div className="divide-y divide-gray-800/60">
          {customProviders.map(p => {
            const st = customSaving[p.id] ?? 'idle'
            return (
              <div key={p.id} className="px-5 py-4 space-y-3 bg-gray-900/20">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-100">{p.label}</span>
                    {p.docsUrl && (
                      <a href={p.docsUrl} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-400 transition">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {p.hasKey
                      ? <span className="flex items-center gap-1 rounded-full bg-green-500/20 border border-green-500/30 px-2 py-0.5 text-xs text-green-400"><ShieldCheck className="h-3 w-3" /> Đã cấu hình</span>
                      : <span className="rounded-full bg-gray-800 border border-gray-700 px-2 py-0.5 text-xs text-gray-500">Chưa có key</span>
                    }
                    <button onClick={() => removeCustom(p.id)} className="text-gray-600 hover:text-red-400 transition">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {p.hasKey && p.masked && (
                  <div className="flex items-center gap-2 rounded-lg bg-gray-900 border border-gray-700/50 px-3 py-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-green-400 shrink-0" />
                    <code className="text-xs text-green-300 font-mono tracking-wider flex-1 truncate">{p.masked}</code>
                  </div>
                )}

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={customShowInputs[p.id] ? 'text' : 'password'}
                      value={customInputs[p.id] ?? ''}
                      onChange={e => { setCustomInputs(v => ({ ...v, [p.id]: e.target.value })); setCustomSaving(v => ({ ...v, [p.id]: 'idle' })) }}
                      onKeyDown={e => e.key === 'Enter' && saveCustomKey(p)}
                      placeholder="Cập nhật API key mới..."
                      className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 pr-9 font-mono text-xs text-white placeholder-gray-700 outline-none focus:border-purple-500"
                    />
                    <button type="button" onClick={() => setCustomShowInputs(v => ({ ...v, [p.id]: !v[p.id] }))}
                      className="absolute right-2.5 top-2.5 text-gray-600 hover:text-gray-400 transition">
                      {customShowInputs[p.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <button
                    onClick={() => saveCustomKey(p)}
                    disabled={!customInputs[p.id]?.trim() || st === 'saving'}
                    className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition disabled:opacity-40 ${
                      st === 'saved' ? 'bg-green-600 text-white' :
                      st === 'error' ? 'bg-red-600 text-white' :
                      'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    <Save className="h-3.5 w-3.5" />
                    {st === 'saving' ? 'Đang lưu...' : st === 'saved' ? '✓ Đã lưu' : st === 'error' ? '✕ Lỗi' : 'Lưu'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Security note */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-4 text-xs text-gray-500 space-y-1">
        <p className="font-semibold text-gray-400 flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Bảo mật</p>
        <p>• Mỗi key được mã hoá riêng bằng <strong className="text-gray-300">AES-256-GCM</strong> với IV ngẫu nhiên</p>
        <p>• Key không bao giờ hiển thị toàn bộ sau khi lưu</p>
        <p>• Cần <strong className="text-gray-300">ENCRYPTION_KEY</strong> trong .env để giải mã — key DB bị lộ cũng vô dụng</p>
        <p>• Nhấn <kbd className="bg-gray-700 px-1 rounded">Enter</kbd> để lưu nhanh</p>
      </div>

      <Link
        href="/admin/content/ai-writer"
        className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition"
      >
        ✨ Mở AI Content Writer
      </Link>
    </div>
  )
}
