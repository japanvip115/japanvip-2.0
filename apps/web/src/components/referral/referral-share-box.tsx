'use client'

import { useEffect, useState } from 'react'
import { Copy, Check, Facebook, Share2 } from 'lucide-react'

export function ReferralShareBox({ code }: { code: string }) {
  const [copied, setCopied] = useState<'link' | 'code' | null>(null)
  const [link, setLink] = useState(`/register?ref=${code}`)

  // Build absolute link client-side (origin chỉ có ở client)
  useEffect(() => {
    setLink(`${window.location.origin}/register?ref=${code}`)
  }, [code])

  async function copy(text: string, which: 'link' | 'code') {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(which)
      setTimeout(() => setCopied(null), 2000)
    } catch { /* ignore */ }
  }

  const shareText = `Mình đang săn hàng nội địa Nhật chính hãng trên Japan VIP — tham gia đấu giá cùng mình nhé! Dùng mã ${code} khi đăng ký để nhận điểm thưởng 🎁`

  function shareNative() {
    if (navigator.share) {
      navigator.share({ title: 'Japan VIP', text: shareText, url: link }).catch(() => {})
    } else {
      copy(`${shareText}\n${link}`, 'link')
    }
  }

  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`

  return (
    <div className="space-y-4">
      {/* Mã giới thiệu */}
      <div>
        <p className="mb-1.5 text-sm font-medium text-gray-600">Mã giới thiệu của bạn</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-lg border-2 border-dashed border-brand-red/40 bg-red-50 px-4 py-3 text-center text-2xl font-black tracking-[0.3em] text-brand-red">
            {code}
          </code>
          <button
            onClick={() => copy(code, 'code')}
            className="flex h-12 w-12 items-center justify-center rounded-lg border bg-white text-gray-600 hover:bg-gray-50"
            title="Sao chép mã"
          >
            {copied === 'code' ? <Check className="h-5 w-5 text-emerald-600" /> : <Copy className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Link giới thiệu */}
      <div>
        <p className="mb-1.5 text-sm font-medium text-gray-600">Link mời bạn bè</p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={link}
            className="flex-1 rounded-lg border bg-gray-50 px-3 py-2.5 text-sm text-gray-700"
            onFocus={(e) => e.target.select()}
          />
          <button
            onClick={() => copy(link, 'link')}
            className="flex items-center gap-1.5 rounded-lg bg-brand-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-red-dark"
          >
            {copied === 'link' ? <><Check className="h-4 w-4" /> Đã chép</> : <><Copy className="h-4 w-4" /> Chép</>}
          </button>
        </div>
      </div>

      {/* Nút chia sẻ nhanh */}
      <div className="flex gap-2">
        <button
          onClick={shareNative}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Share2 className="h-4 w-4" /> Chia sẻ
        </button>
        <a
          href={fbUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#1877F2] py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          <Facebook className="h-4 w-4" /> Facebook
        </a>
      </div>
    </div>
  )
}
