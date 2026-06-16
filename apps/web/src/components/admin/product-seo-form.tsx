'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'

const INPUT_CLS =
  'w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30'
const LABEL_CLS = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400'

function CharCount({ current, max }: { current: number; max: number }) {
  const ratio = current / max
  const color = ratio >= 1 ? 'text-red-400' : ratio >= 0.85 ? 'text-yellow-400' : 'text-gray-500'
  return <span className={`text-xs tabular-nums ${color}`}>{current}/{max}</span>
}

type Props = {
  productId: string
  initialMetaTitle?: string
  initialMetaDesc?: string
}

export function ProductSeoForm({ productId, initialMetaTitle = '', initialMetaDesc = '' }: Props) {
  const [metaTitle, setMetaTitle] = useState(initialMetaTitle)
  const [metaDesc, setMetaDesc] = useState(initialMetaDesc)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      await fetch(`/api/v1/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metaTitle: metaTitle || null, metaDesc: metaDesc || null }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-200">SEO</h2>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className={LABEL_CLS}>Meta Title</label>
          <CharCount current={metaTitle.length} max={60} />
        </div>
        <input
          value={metaTitle}
          onChange={(e) => setMetaTitle(e.target.value)}
          maxLength={60}
          className={INPUT_CLS}
        />
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className={LABEL_CLS}>Meta Description</label>
          <CharCount current={metaDesc.length} max={160} />
        </div>
        <textarea
          value={metaDesc}
          onChange={(e) => setMetaDesc(e.target.value)}
          maxLength={160}
          rows={2}
          className={INPUT_CLS}
        />
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
      >
        {saving ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" />Đang lưu...</>
        ) : saved ? (
          <><CheckCircle2 className="h-3.5 w-3.5" />Đã lưu</>
        ) : (
          'Lưu SEO'
        )}
      </button>
    </div>
  )
}
