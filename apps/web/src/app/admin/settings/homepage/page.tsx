'use client'

import { useEffect, useState } from 'react'
import { Save, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'

const INPUT = 'w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30'
const LABEL = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400'
const TEXTAREA = INPUT + ' resize-none'

const DEFAULTS: Record<string, string> = {
  home_stat1_num: '5', home_stat1_suffix: '+', home_stat1_label: 'Năm Kinh Nghiệm',
  home_stat2_num: '15', home_stat2_suffix: 'K+', home_stat2_label: 'Đơn Hàng Thành Công',
  home_stat3_num: '98', home_stat3_suffix: '%', home_stat3_label: 'Khách Hài Lòng',
  home_stat4_num: '500', home_stat4_suffix: '+', home_stat4_label: 'Thương Hiệu Nhật',
  home_hero_title: 'Gia Dụng Nhật Bản',
  home_hero_accent: 'Đẳng Cấp Vượt Trội',
  home_hero_desc: 'Mua hàng trực tiếp từ Amazon Japan, Rakuten, Mercari với dịch vụ trọn gói – Uy tín – Minh bạch – Nhanh chóng',
  home_bfj_title: 'Dán Link – Nhận Báo Giá Trong 30 Giây',
  home_bfj_desc: 'Chỉ cần copy đường dẫn sản phẩm từ các sàn Nhật Bản, chúng tôi sẽ tự động hiển thị giá, phí vận chuyển và tổng chi phí về Việt Nam.',
  home_products_title: 'Sản Phẩm Bán Chạy',
  home_auctions_title: 'Phiên Đấu Giá Đang Diễn Ra',
  home_why_title: 'Trải Nghiệm Mua Sắm Nhật Bản Đỉnh Cao',
  home_why_desc: 'Chúng tôi kết hợp công nghệ hiện đại với dịch vụ tận tâm để mang đến trải nghiệm mua hàng Nhật Bản tốt nhất cho người Việt.',
  home_why_feat1_title: 'Thanh Toán An Toàn',
  home_why_feat1_desc: 'Thanh toán đặt cọc qua ngân hàng bảo mật, hoàn tiền nếu không giao được hàng.',
  home_why_feat2_title: 'Ảnh Thực Tế 100%',
  home_why_feat2_desc: 'Chụp ảnh thực tế sản phẩm trước khi giao, không dùng ảnh quảng cáo.',
  home_why_feat3_title: 'Đội Ngũ Tại Nhật',
  home_why_feat3_desc: 'Nhân viên túc trực tại Nhật Bản, hỗ trợ mua hàng theo yêu cầu đặc biệt.',
  home_cta_title: 'Sẵn Sàng Trải Nghiệm Gia Dụng Nhật Bản?',
  home_cta_desc: 'Đăng ký ngay hôm nay để nhận ưu đãi phí dịch vụ 0% cho đơn hàng đầu tiên',
  home_cta_btn1: 'Mua Hàng Nhật Ngay',
  home_cta_btn2: 'Tham Gia Đấu Giá',
}

function Section({ title, open, toggle, children }: { title: string; open: boolean; toggle: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/60 overflow-hidden">
      <button type="button" onClick={toggle} className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-gray-700/30 transition-colors">
        <span className="font-semibold text-gray-200">{title}</span>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && <div className="space-y-4 px-5 pb-5">{children}</div>}
    </div>
  )
}

function Field({ label, k, form, set, multiline }: { label: string; k: string; form: Record<string, string>; set: (k: string, v: string) => void; multiline?: boolean }) {
  const placeholder = DEFAULTS[k] ?? ''
  return (
    <div>
      <label className={LABEL}>{label}</label>
      {multiline
        ? <textarea rows={3} value={form[k] ?? ''} onChange={(e) => set(k, e.target.value)} placeholder={placeholder} className={TEXTAREA} />
        : <input value={form[k] ?? ''} onChange={(e) => set(k, e.target.value)} placeholder={placeholder} className={INPUT} />
      }
      {!form[k] && <p className="mt-1 text-[11px] text-gray-600">Để trống = dùng giá trị mặc định</p>}
    </div>
  )
}

export default function HomepageSettingsPage() {
  const [form, setForm] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>({ hero: true, sections: false, stats: false, why: false, cta: false })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const toggle = (s: string) => setOpen((o) => ({ ...o, [s]: !o[s] }))

  useEffect(() => {
    fetch('/api/v1/admin/settings/homepage')
      .then((r) => r.json())
      .then((j) => { setForm(j.data ?? {}); setLoading(false) })
  }, [])

  async function handleSave() {
    setSaving(true); setError(''); setSaved(false)
    try {
      const res = await fetch('/api/v1/admin/settings/homepage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Lỗi lưu')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function resetDefaults() {
    setForm(DEFAULTS)
  }

  if (loading) return <div className="flex h-40 items-center justify-center text-gray-500 text-sm">Đang tải...</div>

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Nội Dung Trang Chủ</h1>
          <p className="mt-0.5 text-sm text-gray-500">Chỉnh sửa các đoạn văn bản hiển thị trên trang chủ</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={resetDefaults}
            className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Khôi phục mặc định
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Đang lưu...' : saved ? '✓ Đã lưu!' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-500/15 border border-red-700/50 px-4 py-3 text-sm text-red-400">{error}</div>}

      <div className="space-y-3 max-w-2xl">

        <Section title="🏠 Hero — Banner chính" open={!!open.hero} toggle={() => toggle('hero')}>
          <Field label="Dòng chữ lớn (màu trắng)" k="home_hero_title" form={form} set={set} />
          <Field label="Dòng chữ accent (màu đỏ)" k="home_hero_accent" form={form} set={set} />
          <Field label="Mô tả dưới tiêu đề" k="home_hero_desc" form={form} set={set} multiline />
        </Section>

        <Section title="📦 Tên các section" open={!!open.sections} toggle={() => toggle('sections')}>
          <Field label="Tiêu đề: Sản phẩm bán chạy" k="home_products_title" form={form} set={set} />
          <Field label="Tiêu đề: Phiên đấu giá" k="home_auctions_title" form={form} set={set} />
        </Section>

        <Section title="🛍️ Mua hộ (BFJ)" open={!!open.bfj} toggle={() => toggle('bfj')}>
          <Field label="Tiêu đề" k="home_bfj_title" form={form} set={set} />
          <Field label="Mô tả" k="home_bfj_desc" form={form} set={set} multiline />
        </Section>

        <Section title="📊 Thống kê nổi bật (4 ô số)" open={!!open.stats} toggle={() => toggle('stats')}>
          {([1,2,3,4] as const).map((n) => (
            <div key={n}>
              <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ô số {n}</p>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Số (VD: 15)" k={`home_stat${n}_num`} form={form} set={set} />
                <Field label="Hậu tố (VD: K+)" k={`home_stat${n}_suffix`} form={form} set={set} />
                <Field label="Nhãn" k={`home_stat${n}_label`} form={form} set={set} />
              </div>
            </div>
          ))}
        </Section>

        <Section title="⭐ Tại sao chọn JapanVip" open={!!open.why} toggle={() => toggle('why')}>
          <Field label="Tiêu đề" k="home_why_title" form={form} set={set} />
          <Field label="Mô tả" k="home_why_desc" form={form} set={set} multiline />
          <div className="border-t border-gray-700 pt-4 space-y-4">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">3 tính năng nổi bật</p>
            {([1,2,3] as const).map((n) => (
              <div key={n} className="grid grid-cols-2 gap-3">
                <Field label={`Tính năng ${n} — Tiêu đề`} k={`home_why_feat${n}_title`} form={form} set={set} />
                <Field label={`Tính năng ${n} — Mô tả`} k={`home_why_feat${n}_desc`} form={form} set={set} />
              </div>
            ))}
          </div>
        </Section>

        <Section title="🎯 CTA — Kêu gọi hành động" open={!!open.cta} toggle={() => toggle('cta')}>
          <Field label="Tiêu đề" k="home_cta_title" form={form} set={set} />
          <Field label="Mô tả" k="home_cta_desc" form={form} set={set} multiline />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nút 1 (đỏ)" k="home_cta_btn1" form={form} set={set} />
            <Field label="Nút 2 (outline)" k="home_cta_btn2" form={form} set={set} />
          </div>
        </Section>

      </div>

      <p className="mt-4 text-xs text-gray-600">Sau khi lưu, nội dung sẽ cập nhật ngay trên trang chủ khi load lại trang.</p>
    </div>
  )
}
