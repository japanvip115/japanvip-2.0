'use client'

import { useState, useEffect } from 'react'
import { Save, RotateCcw, Sparkles, CheckCircle2, AlertCircle, Loader2, Info } from 'lucide-react'

const SECTIONS = [
  {
    key: 'tone',
    title: 'Tone & Voice',
    icon: '🗣️',
    hint: 'Giọng văn, phong cách, đối tượng độc giả',
  },
  {
    key: 'structure',
    title: 'Cấu trúc HTML',
    icon: '🏗️',
    hint: 'Quy tắc dùng h2, h3, div, blockquote trong mô tả sản phẩm',
  },
  {
    key: 'faq',
    title: 'FAQ',
    icon: '❓',
    hint: 'Số câu hỏi, cách trả lời, format output',
  },
  {
    key: 'attributes',
    title: 'Attributes / Thông số',
    icon: '⚙️',
    hint: 'Format JSON cho quick, promo, warranty, specs',
  },
]

export function AiStyleClient() {
  const [style, setStyle] = useState('')
  const [defaultStyle, setDefaultStyle] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [charCount, setCharCount] = useState(0)
  const [activeSection, setActiveSection] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/v1/admin/settings/ai-style')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setStyle(d.style)
          setDefaultStyle(d.default)
          setIsCustom(d.isCustom)
          setCharCount(d.style.length)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    setStatus('idle')
    try {
      const res = await fetch('/api/v1/admin/settings/ai-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style }),
      })
      const d = await res.json()
      if (d.success) { setStatus('saved'); setIsCustom(true) }
      else setStatus('error')
    } catch { setStatus('error') }
    finally { setSaving(false) }
  }

  async function resetToDefault() {
    if (!window.confirm('Khôi phục về style mặc định? Thay đổi của bạn sẽ bị xóa.')) return
    setSaving(true)
    try {
      await fetch('/api/v1/admin/settings/ai-style', { method: 'DELETE' })
      setStyle(defaultStyle)
      setCharCount(defaultStyle.length)
      setIsCustom(false)
      setStatus('saved')
    } catch { setStatus('error') }
    finally { setSaving(false) }
  }

  function highlightSection(key: string) {
    setActiveSection(activeSection === key ? null : key)
    // Scroll textarea to relevant section
    const keywords: Record<string, string> = {
      tone: 'Tone & Voice',
      structure: 'Cấu trúc mô tả',
      faq: 'tạo FAQ',
      attributes: 'tạo Attributes',
    }
    const kw = keywords[key]
    if (!kw) return
    const textarea = document.getElementById('style-editor') as HTMLTextAreaElement | null
    if (!textarea) return
    const idx = style.toLowerCase().indexOf(kw.toLowerCase())
    if (idx >= 0) {
      textarea.focus()
      textarea.setSelectionRange(idx, idx + kw.length)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 text-gray-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-brand-red" />
            <h1 className="text-xl font-bold text-white">Style Content AI</h1>
            {isCustom ? (
              <span className="rounded-full bg-green-900/50 border border-green-700/60 px-2 py-0.5 text-[11px] font-semibold text-green-400">Đã tuỳ chỉnh</span>
            ) : (
              <span className="rounded-full bg-gray-700 border border-gray-600 px-2 py-0.5 text-[11px] font-semibold text-gray-400">Mặc định</span>
            )}
          </div>
          <p className="text-sm text-gray-400">
            System prompt hướng dẫn AI viết nội dung — áp dụng cho toàn bộ AI Content Writer
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isCustom && (
            <button
              onClick={resetToDefault}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-300 hover:border-gray-500 hover:text-white transition disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Khôi phục mặc định
            </button>
          )}
          <button
            onClick={save}
            disabled={saving}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition disabled:opacity-40 ${
              status === 'saved' ? 'bg-green-600 text-white' :
              status === 'error' ? 'bg-red-700 text-white' :
              'bg-brand-red text-white hover:bg-red-700'
            }`}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? 'Đang lưu...' : status === 'saved' ? '✓ Đã lưu!' : status === 'error' ? '✕ Lỗi' : 'Lưu Style'}
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-700/40 bg-blue-900/15 px-4 py-3 text-sm text-blue-300">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-0.5">Hướng dẫn chỉnh style</p>
          <p className="text-blue-400 text-xs leading-relaxed">
            Đây là system prompt gửi cho AI trước mỗi lần tạo nội dung. Chỉnh tone giọng văn, quy tắc HTML, số câu FAQ, format JSON attributes tại đây.
            Thay đổi có hiệu lực ngay lần generate tiếp theo — không cần deploy lại.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_220px] gap-5">

        {/* Main editor */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">System Prompt</p>
            <span className="text-[11px] text-gray-600 tabular-nums">{charCount.toLocaleString()} ký tự</span>
          </div>
          <textarea
            id="style-editor"
            value={style}
            onChange={e => { setStyle(e.target.value); setCharCount(e.target.value.length); setStatus('idle') }}
            rows={32}
            className="w-full resize-none rounded-xl border border-gray-700 bg-gray-800/60 p-5 font-mono text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/20 leading-relaxed"
            spellCheck={false}
          />
        </div>

        {/* Right sidebar: section shortcuts + tips */}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Nhảy đến phần</p>
            <div className="space-y-1.5">
              {SECTIONS.map(s => (
                <button
                  key={s.key}
                  onClick={() => highlightSection(s.key)}
                  className={`w-full flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all ${
                    activeSection === s.key
                      ? 'border-brand-red bg-red-900/20 text-red-400'
                      : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <span className="text-base shrink-0 mt-0.5">{s.icon}</span>
                  <div>
                    <p className="text-xs font-semibold">{s.title}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">{s.hint}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Gợi ý chỉnh nhanh</p>
            <div className="space-y-2 text-[12px] text-gray-400 leading-relaxed">
              <p><span className="text-amber-400 font-semibold">Tone ngắn gọn hơn:</span> thêm "– Viết súc tích, không lan man" vào Tone & Voice</p>
              <p><span className="text-amber-400 font-semibold">Nhiều FAQ hơn:</span> đổi "6-10 câu" thành "12-15 câu"</p>
              <p><span className="text-amber-400 font-semibold">Bỏ compare-grid:</span> xóa phần hướng dẫn compare-grid</p>
              <p><span className="text-amber-400 font-semibold">Thêm section mới:</span> mô tả quy tắc bằng tiếng Việt, AI sẽ tuân theo</p>
            </div>
          </div>

          {status === 'saved' && (
            <div className="flex items-center gap-2 rounded-lg border border-green-700/40 bg-green-900/20 px-3 py-2 text-xs text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              Đã lưu — hiệu lực ngay lần generate tiếp theo
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-center gap-2 rounded-lg border border-red-700/40 bg-red-900/20 px-3 py-2 text-xs text-red-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Lưu thất bại — thử lại
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
