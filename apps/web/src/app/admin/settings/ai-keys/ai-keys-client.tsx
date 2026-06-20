'use client'

import { useEffect, useState } from 'react'
import { Eye, EyeOff, Save, Trash2, ShieldCheck, ExternalLink, ChevronDown, ChevronUp, Plus, X, Info, FlaskConical } from 'lucide-react'
import Link from 'next/link'

function ClaudeCodeCard() {
  const [status, setStatus] = useState<{ available: boolean; version: string | null } | null>(null)
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    fetch('/api/v1/admin/ai/claude-code-status')
      .then(r => r.json())
      .then(setStatus)
      .catch(() => setStatus({ available: false, version: null }))
  }, [])

  return (
    <div className={`rounded-lg border ${status?.available ? 'border-green-500/40 bg-green-900/10' : 'border-gray-600/50 bg-gray-800/30'} px-4 py-3`}>
      <div className="flex items-center gap-2">
        <span>🎌</span>
        <span className="text-sm font-bold text-gray-100">Claude Code</span>
        <span className="rounded-full bg-green-500/20 border border-green-500/30 px-2 py-0.5 text-[10px] font-bold text-green-400">Miễn phí</span>
        <span className="text-xs text-gray-500">· Subscription, không cần API key</span>
        <div className="ml-auto shrink-0">
          {status === null ? (
            <span className="text-xs text-gray-500 animate-pulse">Đang kiểm tra...</span>
          ) : status.available ? (
            <span className="flex items-center gap-1 rounded-full bg-green-500/20 border border-green-500/40 px-2.5 py-1 text-xs text-green-400 font-semibold">
              <ShieldCheck className="h-3 w-3" /> Đã kết nối · {status.version}
            </span>
          ) : (
            <button
              onClick={() => setShowGuide(v => !v)}
              className="flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/30 px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/20 transition"
            >
              Chưa cài đặt {showGuide ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>

      {status && !status.available && showGuide && (
        <div className="mt-3 rounded-lg bg-gray-900/60 border border-gray-700 px-3 py-2.5 text-xs text-gray-400 space-y-1">
          <p><code className="bg-gray-800 px-1 rounded text-orange-300">npm install -g @anthropic-ai/claude-code</code></p>
          <p>Sau đó chạy <code className="bg-gray-800 px-1 rounded text-orange-300">claude login</code> → đăng nhập bằng Google.</p>
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
      { id: 'anthropic',   label: 'Anthropic Claude', badge: 'Khuyên dùng',   desc: 'Tốt nhất cho viết content tiếng Việt, reasoning sâu. Dùng trong AI Content Writer.', docsUrl: 'https://console.anthropic.com/settings/keys', placeholder: 'sk-ant-api03-...' },
      { id: 'openai',      label: 'OpenAI GPT-4o',    badge: 'Phổ biến',      desc: 'Hỗ trợ vision (đưa ảnh vào → AI mô tả). Dùng để phân tích catalog Nhật.', docsUrl: 'https://platform.openai.com/api-keys', placeholder: 'sk-proj-...' },
      { id: 'gemini',      label: 'Google Gemini',     badge: 'Context lớn',   desc: 'Context window 1M token. Tốt cho xử lý catalog dài hoặc nhiều sản phẩm cùng lúc.', docsUrl: 'https://aistudio.google.com/app/apikey', placeholder: 'AIzaSy...' },
      { id: 'openrouter',  label: 'OpenRouter',        badge: 'Multi-model',   desc: 'Truy cập 200+ model (Claude, GPT, Llama, Mistral...) qua 1 API duy nhất. Giá tốt, fallback tự động.', docsUrl: 'https://openrouter.ai/keys', placeholder: 'sk-or-v1-...' },
      { id: 'grok',        label: 'Grok (xAI)',         badge: 'Real-time web', desc: 'Model của Elon Musk / xAI. Truy cập dữ liệu real-time từ X (Twitter). Tốt cho tin tức & xu hướng.', docsUrl: 'https://console.x.ai/', placeholder: 'xai-...' },
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

type TestState = 'idle' | 'testing' | 'ok' | 'fail'

function ProviderRow({
  p, status, saving, error,
  input, showInput,
  onInput, onToggleShow, onSave, onRemove,
}: {
  p: ProviderDef
  status?: ProviderStatus
  saving: 'idle' | 'saving' | 'saved' | 'error'
  error?: string
  input: string
  showInput: boolean
  onInput: (v: string) => void
  onToggleShow: () => void
  onSave: () => void
  onRemove: () => void
}) {
  const [showDesc, setShowDesc] = useState(false)
  const [testState, setTestState] = useState<TestState>('idle')
  const [testMsg, setTestMsg] = useState('')

  async function handleTest() {
    const key = input.trim()
    if (!key) return
    setTestState('testing')
    setTestMsg('')
    try {
      const res = await fetch('/api/v1/admin/settings/ai-keys/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: p.id, apiKey: key }),
      })
      const data = await res.json()
      if (data.ok) {
        setTestState('ok')
        setTestMsg(data.info ?? 'Key hợp lệ')
      } else {
        setTestState('fail')
        setTestMsg(data.error ?? 'Key không hợp lệ')
      }
    } catch {
      setTestState('fail')
      setTestMsg('Không kết nối được')
    }
    setTimeout(() => setTestState('idle'), 6000)
  }

  return (
    <div className="px-4 py-3 bg-gray-900/30 space-y-2">
      {/* Row 1: label + badge + status */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-100">{p.label}</span>
        <span className="rounded-full bg-gray-700/80 px-1.5 py-0.5 text-[10px] text-gray-400">{p.badge}</span>
        <button
          onClick={() => setShowDesc(v => !v)}
          className="text-gray-600 hover:text-gray-400 transition"
          title={p.desc}
        >
          <Info className="h-3 w-3" />
        </button>
        <div className="ml-auto flex items-center gap-2">
          {status?.hasKey ? (
            <>
              <code className="text-[11px] text-green-400/80 font-mono">{status.masked}</code>
              <button onClick={onRemove} className="text-gray-600 hover:text-red-400 transition">
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          ) : (
            <span className="text-[10px] text-gray-600">Chưa có key</span>
          )}
        </div>
      </div>

      {showDesc && (
        <p className="text-[11px] text-gray-500 leading-relaxed">{p.desc}</p>
      )}

      {/* Row 2: input + actions */}
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <input
            type={showInput ? 'text' : 'password'}
            value={input}
            onChange={e => { onInput(e.target.value); setTestState('idle') }}
            onKeyDown={e => e.key === 'Enter' && onSave()}
            placeholder={status?.hasKey ? 'Cập nhật key mới...' : p.placeholder}
            className={`w-full rounded-md border bg-gray-900 px-3 py-1.5 pr-8 font-mono text-xs text-white placeholder-gray-700 outline-none transition focus:ring-1 ${
              testState === 'ok'   ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20' :
              testState === 'fail' ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' :
              'border-gray-700 focus:border-purple-500 focus:ring-purple-500/20'
            }`}
          />
          <button
            type="button"
            onClick={onToggleShow}
            className="absolute right-2 top-1.5 text-gray-600 hover:text-gray-400 transition"
          >
            {showInput ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Test button */}
        <button
          onClick={handleTest}
          disabled={!input.trim() || testState === 'testing'}
          title="Test API key trước khi lưu"
          className={`shrink-0 flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-bold border transition disabled:opacity-40 ${
            testState === 'ok'      ? 'bg-green-500/20 border-green-500/50 text-green-400' :
            testState === 'fail'    ? 'bg-red-500/20 border-red-500/50 text-red-400' :
            testState === 'testing' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
            'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200'
          }`}
        >
          <FlaskConical className="h-3 w-3" />
          {testState === 'testing' ? '...' : testState === 'ok' ? '✓' : testState === 'fail' ? '✕' : 'Test'}
        </button>

        {/* Save button */}
        <button
          onClick={onSave}
          disabled={!input.trim() || saving === 'saving'}
          className={`shrink-0 flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-bold transition disabled:opacity-40 ${
            saving === 'saved' ? 'bg-green-600 text-white' :
            saving === 'error' ? 'bg-red-600 text-white' :
            'bg-purple-600 text-white hover:bg-purple-700'
          }`}
        >
          <Save className="h-3 w-3" />
          {saving === 'saving' ? '...' : saving === 'saved' ? '✓' : saving === 'error' ? '✕' : 'Lưu'}
        </button>

        <a
          href={p.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Lấy API Key"
          className="shrink-0 flex items-center justify-center h-[30px] w-[30px] rounded-md border border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-500 transition"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Test result message */}
      {testState !== 'idle' && testMsg && (
        <p className={`text-[11px] flex items-center gap-1 ${testState === 'ok' ? 'text-green-400' : testState === 'fail' ? 'text-red-400' : 'text-yellow-400'}`}>
          <FlaskConical className="h-3 w-3 shrink-0" />
          {testState === 'ok' ? `✓ ${testMsg}` : testState === 'fail' ? `✕ ${testMsg}` : testMsg}
        </p>
      )}

      {error && <p className="text-[11px] text-red-400">✕ {error}</p>}
    </div>
  )
}

export function AiKeysClient() {
  const [statuses, setStatuses] = useState<Record<string, ProviderStatus>>({})
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [showInputs, setShowInputs] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

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
      setStatuses(v => ({ ...v, [providerId]: { id: providerId, hasKey: true, masked: `${key.slice(0, 10)}${'•'.repeat(16)}` } }))
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
        hasKey: true, masked: `${newKey.slice(0, 10)}${'•'.repeat(16)}`,
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
      setCustomProviders(prev => prev.map(cp => cp.id === p.id ? { ...cp, hasKey: true, masked: `${key.slice(0, 10)}${'•'.repeat(16)}` } : cp))
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">AI API Keys</h1>
          <p className="text-xs text-gray-500 mt-0.5">Mã hoá <strong className="text-gray-400">AES-256-GCM</strong> · Nhấn <kbd className="bg-gray-700 px-1 rounded text-[10px]">Enter</kbd> để lưu nhanh</p>
        </div>
        <div className="rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-center shrink-0">
          <p className="text-xl font-bold text-white leading-none">{configuredCount}<span className="text-gray-500 text-sm">/{Object.keys(statuses).length || 8}</span></p>
          <p className="text-[10px] text-gray-500 mt-0.5">đã cấu hình</p>
        </div>
      </div>

      {/* Claude Code */}
      <ClaudeCodeCard />

      {/* Provider groups — 2 column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {PROVIDER_GROUPS.map(group => (
          <div key={group.title} className={`rounded-lg border ${group.color} overflow-hidden`}>
            <button
              onClick={() => setCollapsed(v => ({ ...v, [group.title]: !v[group.title] }))}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{group.icon}</span>
                <span className="font-semibold text-gray-200 text-sm">{group.title}</span>
                <span className="text-[11px] text-gray-500">
                  {group.providers.filter(p => statuses[p.id]?.hasKey).length}/{group.providers.length}
                </span>
              </div>
              {collapsed[group.title]
                ? <ChevronDown className="h-4 w-4 text-gray-500" />
                : <ChevronUp className="h-4 w-4 text-gray-500" />
              }
            </button>

            {!collapsed[group.title] && (
              <div className="divide-y divide-gray-800/60">
                {group.providers.map(p => (
                  <ProviderRow
                    key={p.id}
                    p={p}
                    status={statuses[p.id]}
                    saving={saving[p.id] ?? 'idle'}
                    error={errors[p.id]}
                    input={inputs[p.id] ?? ''}
                    showInput={!!showInputs[p.id]}
                    onInput={v => { setInputs(s => ({ ...s, [p.id]: v })); setSaving(s => ({ ...s, [p.id]: 'idle' })) }}
                    onToggleShow={() => setShowInputs(s => ({ ...s, [p.id]: !s[p.id] }))}
                    onSave={() => save(p.id)}
                    onRemove={() => remove(p.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Custom providers */}
      <div className="rounded-lg border border-gray-600/50 bg-gray-800/30 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-700/50">
          <div className="flex items-center gap-2">
            <span>🔧</span>
            <span className="font-semibold text-gray-200 text-sm">Provider tùy chỉnh</span>
            <span className="text-[11px] text-gray-500">{customProviders.filter(p => p.hasKey).length}/{customProviders.length}</span>
          </div>
          <button
            onClick={() => setShowAddForm(v => !v)}
            className="flex items-center gap-1 rounded-md border border-gray-600 bg-gray-700 px-2.5 py-1 text-xs font-semibold text-gray-200 hover:border-gray-500 transition"
          >
            {showAddForm ? <><X className="h-3 w-3" /> Đóng</> : <><Plus className="h-3 w-3" /> Thêm</>}
          </button>
        </div>

        {showAddForm && (
          <div className="px-4 py-3 border-b border-gray-700/50 bg-gray-900/40 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Tên provider *"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                className="rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:border-purple-500"
              />
              <input
                type="text"
                placeholder="URL docs (tuỳ chọn)"
                value={newDocsUrl}
                onChange={e => setNewDocsUrl(e.target.value)}
                className="rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:border-purple-500"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="API Key *"
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomProvider()}
                className="flex-1 rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 font-mono text-xs text-white placeholder-gray-600 outline-none focus:border-purple-500"
              />
              <button
                onClick={addCustomProvider}
                disabled={!newLabel.trim() || !newKey.trim() || addingCustom === 'saving'}
                className={`shrink-0 flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-bold transition disabled:opacity-40 ${
                  addingCustom === 'error' ? 'bg-red-600 text-white' : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                <Save className="h-3 w-3" />
                {addingCustom === 'saving' ? '...' : 'Lưu'}
              </button>
            </div>
          </div>
        )}

        {customProviders.length === 0 && !showAddForm ? (
          <div className="px-4 py-4 text-center text-xs text-gray-600">
            Chưa có provider tùy chỉnh. Nhấn <strong className="text-gray-400">+ Thêm</strong> để bắt đầu.
          </div>
        ) : (
          <div className="divide-y divide-gray-800/60">
            {customProviders.map(p => {
              const st = customSaving[p.id] ?? 'idle'
              return (
                <div key={p.id} className="px-4 py-3 bg-gray-900/20 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-100">{p.label}</span>
                    {p.docsUrl && (
                      <a href={p.docsUrl} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-400 transition">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                      {p.hasKey && p.masked && (
                        <code className="text-[11px] text-green-400/80 font-mono">{p.masked}</code>
                      )}
                      {p.hasKey
                        ? <span className="flex items-center gap-1 text-[10px] text-green-400"><ShieldCheck className="h-3 w-3" /></span>
                        : <span className="text-[10px] text-gray-600">Chưa có key</span>
                      }
                      <button onClick={() => removeCustom(p.id)} className="text-gray-600 hover:text-red-400 transition">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <div className="relative flex-1">
                      <input
                        type={customShowInputs[p.id] ? 'text' : 'password'}
                        value={customInputs[p.id] ?? ''}
                        onChange={e => { setCustomInputs(v => ({ ...v, [p.id]: e.target.value })); setCustomSaving(v => ({ ...v, [p.id]: 'idle' })) }}
                        onKeyDown={e => e.key === 'Enter' && saveCustomKey(p)}
                        placeholder="Cập nhật API key..."
                        className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 pr-8 font-mono text-xs text-white placeholder-gray-700 outline-none focus:border-purple-500"
                      />
                      <button type="button" onClick={() => setCustomShowInputs(v => ({ ...v, [p.id]: !v[p.id] }))}
                        className="absolute right-2 top-1.5 text-gray-600 hover:text-gray-400 transition">
                        {customShowInputs[p.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <button
                      onClick={() => saveCustomKey(p)}
                      disabled={!customInputs[p.id]?.trim() || st === 'saving'}
                      className={`shrink-0 flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-bold transition disabled:opacity-40 ${
                        st === 'saved' ? 'bg-green-600 text-white' :
                        st === 'error' ? 'bg-red-600 text-white' :
                        'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
                      <Save className="h-3 w-3" />
                      {st === 'saving' ? '...' : st === 'saved' ? '✓' : st === 'error' ? '✕' : 'Lưu'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-[11px] text-gray-600 flex items-center gap-1.5">
          <ShieldCheck className="h-3 w-3" />
          AES-256-GCM · IV ngẫu nhiên · Key không hiển thị toàn bộ sau khi lưu · Cần ENCRYPTION_KEY trong .env
        </p>
        <Link
          href="/admin/content/ai-writer"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-brand-red px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 transition"
        >
          ✨ AI Writer
        </Link>
      </div>
    </div>
  )
}
