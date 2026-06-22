'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Sparkles, Copy, Save, RefreshCw, Eye, Code2, ChevronRight,
  X, Search, Loader2, AlertCircle, Globe, Database, CheckCircle2,
  PackagePlus, ExternalLink, Wallet, SlidersHorizontal, Square, Lock,
} from 'lucide-react'

const proxyImg = (url: string) =>
  `/api/v1/admin/ai/image-proxy?url=${encodeURIComponent(url)}`

// ── Chi phí claude-sonnet-4-6 ─────────────────────────────────────────────────
const INPUT_PRICE_PER_TOKEN  = 3  / 1_000_000   // $3 / MTok
const OUTPUT_PRICE_PER_TOKEN = 15 / 1_000_000   // $15 / MTok
const USD_TO_VND = 25_500

const EXPECTED_OUTPUT_TOKENS: Record<string, number> = {
  description:  3000,
  faq:           700,
  attributes:    900,
  seo:           300,
  blog:         4500,
  social:        600,
  email:        1200,
  video_script: 2000,
  comparison:   1500,
}

function estimateCost(types: string[], specsText: string): { usd: number; vnd: number } {
  const specsTokens = Math.ceil(specsText.length / 3.5)
  const systemTokens = 550
  let totalUsd = 0
  for (const type of types) {
    const inputTokens  = specsTokens + systemTokens + 250
    const outputTokens = EXPECTED_OUTPUT_TOKENS[type] ?? 1000
    totalUsd += inputTokens * INPUT_PRICE_PER_TOKEN + outputTokens * OUTPUT_PRICE_PER_TOKEN
  }
  return { usd: totalUsd, vnd: totalUsd * USD_TO_VND }
}

type ProductSummary = { id: string; name: string; slug: string }

type ProductDetail = {
  id: string
  name: string
  slug: string
  salePrice: number | null
  marketPrice: number | null
  metaTitle: string | null
  metaDesc: string | null
  description: string | null
  brand: { id: string; name: string } | null
  category: { id: string; name: string } | null
  images: { id: string; url: string; isPrimary: boolean; altText: string }[]
  attributes: { id: string; name: string; value: string }[]
}

type JapanProduct = {
  name: string
  model: string
  priceJPY: number | null
  specs: Array<{ name: string; value: string }>
  images: string[]
  site: string
}

type CompetitorProduct = {
  name: string
  brand: string
  price: number | null
  originalPrice: number | null
  description: string
  specs: Array<{ name: string; value: string }>
  images: string[]
  site: string
  url: string
}

type ContentType = {
  key: string
  label: string
  icon: string
  outputType: 'html' | 'json'
}

const CONTENT_TYPES: ContentType[] = [
  { key: 'description',  label: 'Mô tả sản phẩm',      icon: '📝', outputType: 'html' },
  { key: 'faq',          label: 'Hỏi & Đáp (FAQ)',      icon: '❓', outputType: 'json' },
  { key: 'attributes',   label: 'Thông số & Attr.',      icon: '⚙️', outputType: 'json' },
  { key: 'seo',          label: 'SEO Title & Meta',      icon: '🔍', outputType: 'json' },
  { key: 'blog',         label: 'Bài viết Blog',         icon: '✍️', outputType: 'html' },
  { key: 'social',       label: 'Social Media Post',     icon: '📱', outputType: 'html' },
  { key: 'email',        label: 'Email Marketing',       icon: '📧', outputType: 'html' },
  { key: 'video_script', label: 'Kịch bản Video',        icon: '🎬', outputType: 'html' },
  { key: 'comparison',   label: 'So sánh sản phẩm',     icon: '⚖️', outputType: 'html' },
]

// ── Source mode toggle ─────────────────────────────────────────────────────────
type SourceMode = 'db' | 'japan' | 'competitor'

function buildSpecsFromAttributes(attrs: ProductDetail['attributes']): string {
  return attrs
    .filter(a => !a.name.startsWith('[faq]') && !a.name.startsWith('[promo]') && !a.name.startsWith('[quick]'))
    .map(a => `${a.name.replace(/^\[.*?\]/, '').trim()}: ${a.value}`)
    .join('\n')
}

function buildSpecsFromJapan(specs: JapanProduct['specs']): string {
  return specs.map(s => `${s.name}: ${s.value}`).join('\n')
}

function slugifyVi(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120)
}

// Lấy tiêu đề bài blog từ thẻ heading đầu tiên; fallback tên sản phẩm
function extractBlogTitle(html: string, fallback: string): string {
  const m = html.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/i)
  const t = m ? m[1]!.replace(/<[^>]+>/g, '').trim() : ''
  return t || fallback
}

// Tóm tắt blog = 2 đoạn <p> đầu (bỏ HTML), cắt ~320 ký tự cho thẻ blog đỡ trống
function extractBlogExcerpt(html: string): string {
  const paras = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map(m => m[1]!.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
    .filter(t => t.length > 30)
  const text = paras.slice(0, 2).join(' ').trim()
  if (!text) return ''
  return text.length > 320 ? text.slice(0, 320).replace(/\s+\S*$/, '') + '…' : text
}

const DRAFT_KEY = 'aiwriter_draft_v2'

type Draft = {
  sourceMode: SourceMode
  // Japan mode
  japanUrl: string
  japanProduct: JapanProduct | null
  japanVietName: string
  selectedImages: string[]
  // DB mode
  selectedProduct: ProductDetail | null
  // Competitor mode
  competitorUrl: string
  competitorProduct: CompetitorProduct | null
  selectedCompetitorImages: string[]
  outputs: Record<string, string>
  selectedTypes: string[]
  savedAt: number
}

function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const d: Draft = JSON.parse(raw)
    if (Date.now() - d.savedAt > 7 * 24 * 60 * 60 * 1000) { localStorage.removeItem(DRAFT_KEY); return null }
    return d
  } catch { return null }
}

let _draftTimer: ReturnType<typeof setTimeout> | null = null
function saveDraftDebounced(d: Omit<Draft, 'savedAt'>) {
  if (_draftTimer) clearTimeout(_draftTimer)
  _draftTimer = setTimeout(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...d, savedAt: Date.now() })) } catch { /* ignore */ }
  }, 800)
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
}

export function AiWriterClient({ products }: { products: ProductSummary[] }) {
  // ── Source mode ──
  const [sourceMode, setSourceMode] = useState<SourceMode>('db')
  // ── Balance & cost ──
  const [balance, setBalance] = useState<{ usd: number } | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)
  // ── Word limit ──
  const [maxWords, setMaxWords] = useState<number>(1500)
  const [testMode, setTestMode] = useState(false)
  // ── AI Provider ──
  const [aiProvider, setAiProvider] = useState<'anthropic' | 'claude-code'>('claude-code')
  const [claudeCodeAvailable, setClaudeCodeAvailable] = useState<boolean | null>(null)
  const [claudeCodeModel, setClaudeCodeModel] = useState('claude-opus-4-8')
  const [anthropicEnabled, setAnthropicEnabled] = useState(true)

  useEffect(() => {
    setAnthropicEnabled(localStorage.getItem('ai_anthropic_enabled') !== 'false')
    const savedModel = localStorage.getItem('ai_claude_code_model')
    if (savedModel) setClaudeCodeModel(savedModel)
  }, [])

  useEffect(() => {
    fetch('/api/v1/admin/ai/claude-code-status')
      .then(r => r.json())
      .then(d => {
        setClaudeCodeAvailable(d.available ?? false)
        if (d.available) setAiProvider('claude-code')
      })
      .catch(() => setClaudeCodeAvailable(false))
  }, [])

  // ── DB mode state ──
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [loadingProduct, setLoadingProduct] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null)

  // ── Japan URL mode state ──
  const [japanUrl, setJapanUrl] = useState('')
  const [scraping, setScraping] = useState(false)
  const [japanProduct, setJapanProduct] = useState<JapanProduct | null>(null)
  const [japanVietName, setJapanVietName] = useState('')
  const [translatingName, setTranslatingName] = useState(false)
  const [showLockInfo, setShowLockInfo] = useState(false)
  const [scrapeError, setScrapeError] = useState('')
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [extraImages, setExtraImages] = useState<string[]>([])
  const [searchingImages, setSearchingImages] = useState(false)
  const [searchImagesMsg, setSearchImagesMsg] = useState('')
  const [featurePageUrl, setFeaturePageUrl] = useState('')
  const [pasteImageUrl, setPasteImageUrl] = useState('')
  const [scrapingFeature, setScrapingFeature] = useState(false)
  const [featureMsg, setFeatureMsg] = useState('')
  const [hasDraft, setHasDraft] = useState(false)

  // ── Competitor URL mode state ──
  const [competitorUrl, setCompetitorUrl] = useState('')
  const [scrapingCompetitor, setScrapingCompetitor] = useState(false)
  const [competitorProduct, setCompetitorProduct] = useState<CompetitorProduct | null>(null)
  const [competitorError, setCompetitorError] = useState('')
  const [selectedCompetitorImages, setSelectedCompetitorImages] = useState<Set<string>>(new Set())

  // ── Content generation state ──
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['description'])
  const [customInstruction, setCustomInstruction] = useState('')
  const [freePromptMode, setFreePromptMode] = useState(false)
  const [freePrompt, setFreePrompt] = useState('')
  const [outputs, setOutputs] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState('description')
  const [loading, setLoading] = useState(false)
  const [currentGenerating, setCurrentGenerating] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [publishStatus, setPublishStatus] = useState<'idle' | 'publishing' | 'done' | 'error'>('idle')
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null)
  const [publishedId, setPublishedId] = useState<string | null>(null)
  const [blogSaveStatus, setBlogSaveStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [blogPostId, setBlogPostId] = useState<string | null>(null)
  const [cpubStatus, setCpubStatus] = useState<'idle' | 'publishing' | 'done' | 'error'>('idle')
  const [cpubSlug, setCpubSlug] = useState<string | null>(null)
  const [cpubId, setCpubId] = useState<string | null>(null)
  const outputRef = useRef<HTMLTextAreaElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 15)

  const hasSource = sourceMode === 'db' ? !!selectedProduct
    : sourceMode === 'japan' ? !!japanProduct
    : !!competitorProduct

  const currentSpecsText = sourceMode === 'db' && selectedProduct
    ? buildSpecsFromAttributes(selectedProduct.attributes)
    : sourceMode === 'japan' && japanProduct
      ? buildSpecsFromJapan(japanProduct.specs)
      : sourceMode === 'competitor' && competitorProduct
        ? competitorProduct.specs.map(s => `${s.name}: ${s.value}`).join('\n')
        : ''

  const costEstimate = hasSource ? estimateCost(selectedTypes, currentSpecsText) : null

  const currentType = CONTENT_TYPES.find(t => t.key === activeTab) ?? CONTENT_TYPES[0]!
  const output = outputs[activeTab] ?? ''

  // Fetch balance on mount
  useEffect(() => {
    setBalanceLoading(true)
    fetch('/api/v1/admin/ai/balance')
      .then(r => r.json())
      .then(d => { if (d.success) setBalance({ usd: d.remainingUsd }) })
      .catch(() => {})
      .finally(() => setBalanceLoading(false))
  }, [])

  // Load draft on mount
  useEffect(() => {
    const draft = loadDraft()
    if (!draft || Object.keys(draft.outputs ?? {}).length === 0) return
    if (draft.sourceMode === 'japan' && draft.japanProduct) {
      setSourceMode('japan')
      setJapanUrl(draft.japanUrl)
      setJapanProduct(draft.japanProduct)
      if (draft.japanVietName) setJapanVietName(draft.japanVietName)
      setSelectedImages(new Set(draft.selectedImages))
      setOutputs(draft.outputs)
      setSelectedTypes(draft.selectedTypes)
      if (draft.selectedTypes[0]) setActiveTab(draft.selectedTypes[0])
      setHasDraft(true)
    } else if (draft.sourceMode === 'db' && draft.selectedProduct) {
      setSourceMode('db')
      setSelectedProduct(draft.selectedProduct)
      setSearch(draft.selectedProduct.name)
      setOutputs(draft.outputs)
      setSelectedTypes(draft.selectedTypes)
      if (draft.selectedTypes[0]) setActiveTab(draft.selectedTypes[0])
      setHasDraft(true)
    } else if (draft.sourceMode === 'competitor' && draft.competitorProduct) {
      setSourceMode('competitor')
      setCompetitorUrl(draft.competitorUrl ?? '')
      setCompetitorProduct(draft.competitorProduct)
      setSelectedCompetitorImages(new Set(draft.selectedCompetitorImages ?? []))
      setOutputs(draft.outputs)
      setSelectedTypes(draft.selectedTypes)
      if (draft.selectedTypes[0]) setActiveTab(draft.selectedTypes[0])
      setHasDraft(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-save draft khi outputs thay đổi (tất cả mode, kể cả đang stream)
  useEffect(() => {
    if (Object.keys(outputs).length === 0) return
    if (sourceMode === 'japan' && !japanProduct) return
    if (sourceMode === 'db' && !selectedProduct) return
    if (sourceMode === 'competitor' && !competitorProduct) return
    saveDraftDebounced({
      sourceMode,
      japanUrl,
      japanProduct,
      japanVietName,
      selectedImages: [...selectedImages],
      selectedProduct,
      competitorUrl,
      competitorProduct,
      selectedCompetitorImages: [...selectedCompetitorImages],
      outputs,
      selectedTypes,
    })
  }, [outputs, sourceMode, japanProduct, japanUrl, japanVietName, selectedImages, selectedTypes, selectedProduct, competitorProduct, competitorUrl, selectedCompetitorImages])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!(e.target as Element).closest('.product-search-wrap')) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── DB product select ──
  async function selectProduct(p: ProductSummary) {
    setSearch(p.name)
    setShowDropdown(false)
    setLoadingProduct(true)
    setSelectedProduct(null)
    setOutputs({})
    setSaveStatus('idle')
    try {
      const res = await fetch(`/api/v1/admin/products/${p.id}`)
      const data = await res.json()
      setSelectedProduct(data.data ?? null)
    } catch { /* noop */ }
    finally { setLoadingProduct(false) }
  }

  function clearDbProduct() {
    setSelectedProduct(null)
    setSearch('')
    setOutputs({})
    setSaveStatus('idle')
    setTimeout(() => searchRef.current?.focus(), 50)
  }

  // ── Japan scrape ──
  async function scrapeJapan() {
    if (!japanUrl.trim()) return
    setScraping(true)
    setScrapeError('')
    setJapanProduct(null)
    setSelectedImages(new Set())
    setExtraImages([])
    setSearchImagesMsg('')
    setFeaturePageUrl('')
    setPasteImageUrl('')
    setFeatureMsg('')
    setOutputs({})
    setSaveStatus('idle')
    setHasDraft(false)
    clearDraft()
    setPublishStatus('idle')
    setPublishedSlug(null)
    try {
      const res = await fetch('/api/v1/admin/ai/scrape-japan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: japanUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setScrapeError(data.message ?? 'Không lấy được thông tin')
      } else {
        setJapanProduct(data.data)
        setSelectedImages(new Set(data.data.images.slice(0, 4)))
      }
    } catch {
      setScrapeError('Lỗi kết nối')
    } finally {
      setScraping(false)
    }
  }

  function toggleImage(url: string) {
    setSelectedImages(prev => {
      const next = new Set(prev)
      next.has(url) ? next.delete(url) : next.add(url)
      return next
    })
  }

  // ── Tìm thêm ảnh qua Google (SafeSearch) theo Model ──
  async function searchMoreImages() {
    if (!japanProduct || searchingImages) return
    setSearchingImages(true)
    setSearchImagesMsg('')
    try {
      const query = [japanProduct.model, japanProduct.name].filter(Boolean).join(' ')
      const res = await fetch('/api/v1/admin/ai/search-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setSearchImagesMsg(data.error ?? 'Không tìm được ảnh')
        return
      }
      const existing = new Set([...japanProduct.images, ...extraImages])
      const fresh = (data.images as { url: string }[])
        .map(i => i.url)
        .filter(u => !existing.has(u))
      if (fresh.length === 0) {
        setSearchImagesMsg('Không có ảnh mới phù hợp')
      } else {
        setExtraImages(prev => [...prev, ...fresh])
        setSearchImagesMsg(`+${fresh.length} ảnh từ Google`)
      }
    } catch {
      setSearchImagesMsg('Lỗi kết nối')
    } finally {
      setSearchingImages(false)
    }
  }

  // ── Dán URL ảnh trực tiếp (1 hoặc nhiều dòng) → thêm vào kho ảnh để chọn ──
  function addPastedImages() {
    const urls = pasteImageUrl
      .split(/[\s\n,]+/)
      .map(u => u.trim())
      .filter(u => /^https?:\/\//i.test(u))
    if (urls.length === 0) { setFeatureMsg('Chưa có URL ảnh hợp lệ'); return }
    const existing = new Set([...(japanProduct?.images ?? []), ...extraImages])
    const fresh = urls.filter(u => !existing.has(u))
    if (fresh.length === 0) { setFeatureMsg('Ảnh đã có trong danh sách'); return }
    setExtraImages(prev => [...prev, ...fresh])
    setPasteImageUrl('')
    setFeatureMsg(`+${fresh.length} ảnh đã thêm`)
  }

  // ── Lấy ảnh giới thiệu tính năng từ TRANG CHÍNH HÃNG (Playwright render JS, chạy local) ──
  async function scrapeFeatureImages() {
    const url = featurePageUrl.trim()
    if (!/^https?:\/\//i.test(url) || scrapingFeature) { setFeatureMsg('Dán URL trang hãng hợp lệ'); return }
    setScrapingFeature(true)
    setFeatureMsg('')
    try {
      const res = await fetch('/api/v1/admin/ai/scrape-feature-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setFeatureMsg(data.error ?? 'Không lấy được ảnh')
        return
      }
      const existing = new Set([...(japanProduct?.images ?? []), ...extraImages])
      const fresh = (data.images as string[]).filter(u => !existing.has(u))
      if (fresh.length === 0) { setFeatureMsg('Không có ảnh mới'); return }
      setExtraImages(prev => [...prev, ...fresh])
      setFeatureMsg(`+${fresh.length} ảnh tính năng từ trang hãng`)
    } catch {
      setFeatureMsg('Lỗi kết nối')
    } finally {
      setScrapingFeature(false)
    }
  }

  // ── Tự dịch tên sản phẩm sang tiếng Việt (Loại cốt lõi + Hãng + Model + Tính năng phụ + Thông số) ──
  async function translateName(): Promise<string> {
    if (!japanProduct || translatingName) return ''
    setTranslatingName(true)
    try {
      const res = await fetch('/api/v1/admin/ai/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'product_name',
          productName: japanProduct.name,
          specs: buildSpecsFromJapan(japanProduct.specs),
          extra: japanProduct.model ? `Model: ${japanProduct.model}` : '',
          provider: aiProvider,
          claudeCodeModel: aiProvider === 'claude-code' ? claudeCodeModel : undefined,
        }),
      })
      if (!res.ok) return ''
      const raw = await res.text()
      const name = raw.replace(/<[^>]+>/g, '').replace(/["'`]/g, '').trim().split('\n').map(l => l.trim()).filter(Boolean)[0] ?? ''
      if (name) setJapanVietName(name)
      return name
    } catch {
      return ''
    } finally {
      setTranslatingName(false)
    }
  }

  // ── Competitor scrape ──
  async function scrapeCompetitor() {
    if (!competitorUrl.trim()) return
    setScrapingCompetitor(true)
    setCompetitorError('')
    setCompetitorProduct(null)
    setSelectedCompetitorImages(new Set())
    setOutputs({})
    setSaveStatus('idle')
    try {
      const res = await fetch('/api/v1/admin/ai/scrape-competitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: competitorUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setCompetitorError(data.message ?? 'Không lấy được thông tin')
      } else {
        setCompetitorProduct(data.data)
        setSelectedCompetitorImages(new Set(data.data.images.slice(0, 4)))
      }
    } catch {
      setCompetitorError('Lỗi kết nối')
    } finally {
      setScrapingCompetitor(false)
    }
  }

  function toggleCompetitorImage(url: string) {
    setSelectedCompetitorImages(prev => {
      const next = new Set(prev)
      next.has(url) ? next.delete(url) : next.add(url)
      return next
    })
  }

  // ── Content type toggle ──
  function toggleType(key: string) {
    setSelectedTypes(prev =>
      prev.includes(key)
        ? prev.length === 1 ? prev : prev.filter(k => k !== key)
        : [...prev, key]
    )
    if (!selectedTypes.includes(key)) setActiveTab(key)
  }

  // ── Stream generation ──
  async function streamOne(type: string): Promise<string> {
    let productName = ''
    let specs = ''
    let extra = ''

    if (sourceMode === 'db' && selectedProduct) {
      productName = selectedProduct.name
      specs = buildSpecsFromAttributes(selectedProduct.attributes)
      extra = [
        selectedProduct.salePrice ? `Giá bán: ${selectedProduct.salePrice.toLocaleString('vi-VN')}đ` : '',
        selectedProduct.brand ? `Thương hiệu: ${selectedProduct.brand.name}` : '',
        selectedProduct.category ? `Danh mục: ${selectedProduct.category.name}` : '',
      ].filter(Boolean).join('\n')
    } else if (sourceMode === 'japan' && japanProduct) {
      productName = japanVietName.trim() || japanProduct.name
      specs = buildSpecsFromJapan(japanProduct.specs)
      extra = [
        japanProduct.model ? `Model: ${japanProduct.model}` : '',
        japanVietName.trim() && japanProduct.name ? `Tên gốc (tham khảo): ${japanProduct.name}` : '',
        japanProduct.priceJPY ? `Giá tại Nhật: ${japanProduct.priceJPY.toLocaleString('ja-JP')}円` : '',
        `Nguồn: ${japanUrl}`,
      ].filter(Boolean).join('\n')
    } else if (sourceMode === 'competitor' && competitorProduct) {
      productName = competitorProduct.name
      specs = competitorProduct.specs.map(s => `${s.name}: ${s.value}`).join('\n')
      extra = [
        competitorProduct.brand ? `Thương hiệu: ${competitorProduct.brand}` : '',
        competitorProduct.price ? `Giá đối thủ: ${competitorProduct.price.toLocaleString('vi-VN')}₫` : '',
        competitorProduct.description ? `Mô tả gốc (của đối thủ, cần viết lại hoàn toàn):\n${competitorProduct.description.slice(0, 800)}` : '',
        `Nguồn đối thủ: ${competitorProduct.site}`,
      ].filter(Boolean).join('\n')
    }

    const abort = new AbortController()
    abortRef.current = abort

    const res = await fetch('/api/v1/admin/ai/generate-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: abort.signal,
      body: JSON.stringify({
        type,
        productName,
        specs,
        keywords: productName,
        extra,
        customInstruction: freePromptMode ? '' : customInstruction,
        freePrompt: freePromptMode ? freePrompt : '',
        maxWords: testMode ? undefined : maxWords,
        testMode,
        provider: aiProvider,
        claudeCodeModel: aiProvider === 'claude-code' ? claudeCodeModel : undefined,
        productId: sourceMode === 'db' ? selectedProduct?.id : undefined,
        categoryId: sourceMode === 'db' ? selectedProduct?.category?.id : undefined,
        brandId: sourceMode === 'db' ? selectedProduct?.brand?.id : undefined,
        images: (type === 'description' || type === 'blog')
          ? (sourceMode === 'japan' ? [...selectedImages]
            : sourceMode === 'competitor' ? [...selectedCompetitorImages] : [])
          : undefined,
      }),
    })
    if (!res.ok) throw new Error('API error')

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let text = ''
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value, { stream: true })
        setOutputs(prev => ({ ...prev, [type]: text }))
        if (outputRef.current && activeTab === type) {
          outputRef.current.scrollTop = outputRef.current.scrollHeight
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return text // user stopped — keep partial
      throw err
    }
    return text
  }

  function stopGenerate() {
    abortRef.current?.abort()
    abortRef.current = null
    setLoading(false)
    setCurrentGenerating('')
  }

  async function generate() {
    if (!hasSource) return

    // Tự dịch tên sang tiếng Việt nếu ô còn trống (mode Trang Nhật)
    if (sourceMode === 'japan' && japanProduct && !japanVietName.trim()) {
      await translateName()
    }

    // Chỉ generate các loại chưa có output
    const typesToGenerate = selectedTypes.filter(t => !outputs[t])

    // Nếu tất cả đã có output → hỏi trước khi xóa
    if (typesToGenerate.length === 0) {
      if (!window.confirm('Tất cả nội dung đã được tạo rồi.\nTạo lại sẽ xóa toàn bộ và tốn thêm API. Tiếp tục?')) return
      setOutputs({})
      setSaveStatus('idle')
      setActiveTab(selectedTypes[0]!)
      setLoading(true)
      try {
        for (const type of selectedTypes) {
          setCurrentGenerating(type)
          setActiveTab(type)
          await streamOne(type)
        }
      } catch {
        setOutputs(prev => ({ ...prev, [currentGenerating]: '❌ Lỗi API. Kiểm tra API Key trong Cài đặt → AI Keys.' }))
      } finally {
        setLoading(false)
        setCurrentGenerating('')
      }
      return
    }

    // Một số loại đã có, hỏi nếu người dùng chọn lại loại đó
    const alreadyDone = selectedTypes.filter(t => !!outputs[t])
    if (alreadyDone.length > 0) {
      const names = alreadyDone.map(t => CONTENT_TYPES.find(ct => ct.key === t)?.label ?? t).join(', ')
      if (!window.confirm(`"${names}" đã có nội dung rồi — bỏ qua để tiết kiệm API.\nChỉ tạo: ${typesToGenerate.map(t => CONTENT_TYPES.find(ct => ct.key === t)?.label).join(', ')}.\n\nTiếp tục?`)) return
    }

    setLoading(true)
    setSaveStatus('idle')
    setActiveTab(typesToGenerate[0]!)
    try {
      for (const type of typesToGenerate) {
        setCurrentGenerating(type)
        setActiveTab(type)
        await streamOne(type)
      }
    } catch {
      setOutputs(prev => ({ ...prev, [currentGenerating]: '❌ Lỗi API. Kiểm tra API Key trong Cài đặt → AI Keys.' }))
    } finally {
      setLoading(false)
      setCurrentGenerating('')
    }
  }

  // ── Publish Japan product ──
  async function publishProduct() {
    if (!japanProduct) return
    setPublishStatus('publishing')
    try {
      const res = await fetch('/api/v1/admin/ai/publish-japan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: japanVietName.trim() || japanProduct.name,
          originUrl: japanUrl,
          priceJPY: japanProduct.priceJPY,
          selectedImages: [...selectedImages],
          description: outputs['description'] ?? null,
          faq: outputs['faq'] ?? null,
          attributes: outputs['attributes'] ?? null,
          seo: outputs['seo'] ?? null,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setPublishStatus('error')
      } else {
        setPublishStatus('done')
        setPublishedSlug(data.slug)
        setPublishedId(data.productId)
      }
    } catch {
      setPublishStatus('error')
    }
  }

  // 🔒 LOCKED (2026-06) — Lưu Blog riêng (KHÔNG nhồi vào sản phẩm) + excerpt. Xem CLAUDE.md. KHÔNG tự sửa.
  // ── Lưu bài Blog (riêng, KHÔNG tạo sản phẩm) ──
  async function saveBlog() {
    const content = outputs['blog']
    if (!content || blogSaveStatus === 'saving') return
    setBlogSaveStatus('saving')
    try {
      const fallbackName =
        sourceMode === 'japan' ? (japanVietName.trim() || japanProduct?.name || 'Bài viết')
        : sourceMode === 'competitor' ? (competitorProduct?.name || 'Bài viết')
        : (selectedProduct?.name || 'Bài viết')
      const title = extractBlogTitle(content, fallbackName)
      const thumb =
        sourceMode === 'japan' ? [...selectedImages][0]
        : sourceMode === 'competitor' ? [...selectedCompetitorImages][0]
        : selectedProduct?.images?.[0]?.url
      const res = await fetch('/api/v1/admin/content/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug: slugifyVi(title) || `bai-viet-${Date.now()}`,
          content,
          excerpt: extractBlogExcerpt(content) || undefined,
          thumbnailUrl: thumb || undefined,
          status: 'DRAFT',
        }),
      })
      const data = await res.json()
      if (!res.ok || !data?.data?.id) {
        setBlogSaveStatus('error')
      } else {
        setBlogSaveStatus('done')
        setBlogPostId(data.data.id)
      }
    } catch {
      setBlogSaveStatus('error')
    }
  }

  // ── Publish competitor product as draft ──
  async function publishCompetitor() {
    if (!competitorProduct) return
    setCpubStatus('publishing')
    try {
      const res = await fetch('/api/v1/admin/ai/publish-japan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: competitorProduct.name,
          originUrl: competitorUrl,
          salePriceVnd: competitorProduct.price,
          selectedImages: [...selectedCompetitorImages],
          description: outputs['description'] ?? null,
          faq: outputs['faq'] ?? null,
          attributes: outputs['attributes'] ?? null,
          seo: outputs['seo'] ?? null,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setCpubStatus('error')
      } else {
        setCpubStatus('done')
        setCpubSlug(data.slug)
        setCpubId(data.productId)
      }
    } catch {
      setCpubStatus('error')
    }
  }

  // ── Save to product ──
  async function saveToProduct() {
    if (!selectedProduct || !output) return
    setSaveStatus('saving')
    try {
      if (activeTab === 'description') {
        const res = await fetch(`/api/v1/admin/products/${selectedProduct.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: output }),
        })
        const data = await res.json()
        setSaveStatus(data.success ? 'saved' : 'error')
      } else if (activeTab === 'faq') {
        const json = extractJson(output)
        if (!json) { setSaveStatus('error'); return }
        const items = Array.isArray(json) ? json : json.faq ?? []
        const res = await fetch(`/api/v1/admin/products/${selectedProduct.id}/attributes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attributes: items.map((item: { name: string; value: string }) => ({
              name: `[faq]${item.name}`, value: item.value,
            })),
          }),
        })
        const data = await res.json()
        setSaveStatus(data.success ? 'saved' : 'error')
      } else if (activeTab === 'seo') {
        const json = extractJson(output)
        if (!json) { setSaveStatus('error'); return }
        const res = await fetch(`/api/v1/admin/products/${selectedProduct.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metaTitle: json.title, metaDesc: json.description }),
        })
        const data = await res.json()
        setSaveStatus(data.success ? 'saved' : 'error')
      } else {
        setSaveStatus('idle')
      }
    } catch {
      setSaveStatus('error')
    }
  }

  function extractJson(text: string) {
    try {
      const m = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/)
      return JSON.parse(m?.[1] ?? text)
    } catch { return null }
  }

  const dbSpecsPreview = selectedProduct
    ? selectedProduct.attributes.filter(a => !a.name.startsWith('[faq]') && !a.name.startsWith('[promo]')).slice(0, 5)
    : []

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">

      {/* ── Left panel ── */}
      <div className="w-[380px] shrink-0 border-r border-gray-700 bg-gray-900 overflow-y-auto flex flex-col">

        {/* Header */}
        <div className="p-4 border-b border-gray-700 bg-gray-800">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-brand-red" />
            <h1 className="text-sm font-bold text-white">AI Content Writer</h1>

            {/* 🔒 Badge trạng thái khoá — rule Trang Nhật đã chốt (xem CLAUDE.md mục LOCKED) */}
            <div className="relative ml-auto">
              <button
                type="button"
                onClick={() => setShowLockInfo(v => !v)}
                title="Rule AI Writer Trang Nhật đã được khoá"
                className="flex items-center gap-1 rounded-full border border-emerald-700/60 bg-emerald-900/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400 hover:bg-emerald-900/50 transition"
              >
                <Lock className="h-3 w-3" />
                Đã khoá
              </button>
              {showLockInfo && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowLockInfo(false)} />
                  <div className="absolute right-0 top-full z-20 mt-1.5 w-72 rounded-lg border border-gray-700 bg-gray-900 p-3 text-[11px] text-gray-300 shadow-xl">
                    <p className="mb-1.5 flex items-center gap-1 font-bold text-emerald-400">
                      <Lock className="h-3 w-3" /> Rule đã chốt &amp; khoá (2026-06)
                    </p>
                    <ul className="space-y-1 text-gray-400">
                      <li>✔ Dịch tên VN [Loại][Hãng][Model][Tính năng][Thông số]</li>
                      <li>✔ Chèn ảnh theo ngữ cảnh + lưu R2</li>
                      <li>✔ Quy đổi giá ¥→VNĐ</li>
                      <li>✔ Bài thuần tiếng Việt, không placeholder máy móc</li>
                      <li>✔ Khối phải = admin tự thêm (AI không đụng)</li>
                      <li>✔ Scraper lấy giá + công suất + điện áp</li>
                    </ul>
                    <p className="mt-2 border-t border-gray-800 pt-2 text-[10px] text-gray-500">
                      Khoá thật bằng <span className="text-gray-300">CLAUDE.md</span> + Git — AI phiên sau không được tự sửa/xoá nếu chưa được duyệt.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Balance display */}
          <div className="flex items-center justify-between mb-3 rounded-lg border border-gray-700 bg-gray-900/60 px-3 py-1.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Wallet className="h-3.5 w-3.5 text-gray-500" />
              <span>Số dư Anthropic</span>
            </div>
            {balanceLoading ? (
              <Loader2 className="h-3 w-3 text-gray-600 animate-spin" />
            ) : balance ? (
              <span className={`text-xs font-bold tabular-nums ${balance.usd < 1 ? 'text-red-400' : balance.usd < 5 ? 'text-amber-400' : 'text-green-400'}`}>
                ${balance.usd.toFixed(2)}
              </span>
            ) : (
              <a
                href="https://console.anthropic.com/settings/billing"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition"
              >
                Xem console <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
          </div>

          {/* Source mode tabs */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => { setSourceMode('db'); setJapanProduct(null); setScrapeError(''); setCompetitorProduct(null); setCompetitorError('') }}
              className={`flex flex-col items-center justify-center gap-1 rounded-lg py-2 px-1 text-[11px] font-semibold border transition-all ${
                sourceMode === 'db'
                  ? 'border-brand-red bg-red-900/30 text-red-400'
                  : 'border-gray-600 bg-gray-700/50 text-gray-400 hover:text-gray-200'
              }`}
            >
              <Database className="h-3.5 w-3.5" />
              Có sẵn
            </button>
            <button
              onClick={() => { setSourceMode('japan'); setSelectedProduct(null); setSearch(''); setCompetitorProduct(null); setCompetitorError('') }}
              className={`flex flex-col items-center justify-center gap-1 rounded-lg py-2 px-1 text-[11px] font-semibold border transition-all ${
                sourceMode === 'japan'
                  ? 'border-blue-500 bg-blue-900/30 text-blue-400'
                  : 'border-gray-600 bg-gray-700/50 text-gray-400 hover:text-gray-200'
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              🇯🇵 Trang Nhật
            </button>
            <button
              onClick={() => { setSourceMode('competitor'); setSelectedProduct(null); setSearch(''); setJapanProduct(null); setScrapeError('') }}
              className={`flex flex-col items-center justify-center gap-1 rounded-lg py-2 px-1 text-[11px] font-semibold border transition-all ${
                sourceMode === 'competitor'
                  ? 'border-orange-500 bg-orange-900/30 text-orange-400'
                  : 'border-gray-600 bg-gray-700/50 text-gray-400 hover:text-gray-200'
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              🏪 Đối thủ
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 space-y-4">

          {/* ════════════════ DB MODE ════════════════ */}
          {sourceMode === 'db' && (
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">
                <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-brand-red text-white text-[9px] font-black mr-1.5">1</span>
                Chọn sản phẩm
              </p>

              <div className="product-search-wrap relative">
                {!selectedProduct ? (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
                      <input
                        ref={searchRef}
                        type="text"
                        placeholder="Tìm tên / model sản phẩm..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setShowDropdown(true) }}
                        onFocus={() => setShowDropdown(true)}
                        className="w-full rounded-lg border border-gray-600 bg-gray-800 pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/20"
                      />
                      {loadingProduct && <Loader2 className="absolute right-3 top-2.5 h-3.5 w-3.5 text-gray-400 animate-spin" />}
                    </div>

                    {showDropdown && search.length > 0 && filtered.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-600 bg-gray-800 shadow-2xl max-h-64 overflow-y-auto">
                        {filtered.map(p => (
                          <button key={p.id} onMouseDown={() => selectProduct(p)}
                            className="w-full px-3 py-2.5 text-left hover:bg-gray-700 transition-colors flex items-center gap-2 group">
                            <ChevronRight className="h-3 w-3 text-gray-600 group-hover:text-brand-red shrink-0 transition-colors" />
                            <span className="text-sm text-gray-200 line-clamp-1">{p.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded-xl border border-green-700/50 bg-green-900/15 p-3">
                    <div className="flex items-start gap-3">
                      {selectedProduct.images[0] && (
                        <img src={selectedProduct.images[0].url} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0 border border-gray-700" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white line-clamp-2 leading-snug">{selectedProduct.name}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {selectedProduct.brand && <span className="text-[10px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">{selectedProduct.brand.name}</span>}
                          {selectedProduct.category && <span className="text-[10px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">{selectedProduct.category.name}</span>}
                          {selectedProduct.salePrice && <span className="text-[10px] bg-red-900/50 text-red-300 px-1.5 py-0.5 rounded font-semibold">{selectedProduct.salePrice.toLocaleString('vi-VN')}đ</span>}
                        </div>
                      </div>
                      <button onClick={clearDbProduct} className="shrink-0 text-gray-500 hover:text-red-400 transition"><X className="h-4 w-4" /></button>
                    </div>

                    {dbSpecsPreview.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-700/50">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                          Thông số ({selectedProduct.attributes.length} mục)
                        </p>
                        <div className="space-y-0.5">
                          {dbSpecsPreview.map(a => (
                            <div key={a.id} className="text-[11px] text-gray-400">
                              <span className="text-gray-500">{a.name.replace(/^\[.*?\]/, '').trim()}:</span>{' '}
                              <span className="text-gray-300">{a.value}</span>
                            </div>
                          ))}
                          {selectedProduct.attributes.length > 5 && (
                            <p className="text-[10px] text-gray-600">+ {selectedProduct.attributes.length - 5} thông số khác</p>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedProduct.attributes.length === 0 && (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-500">
                        <AlertCircle className="h-3 w-3" />
                        Chưa có thông số — AI sẽ dựa vào tên sản phẩm
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Restore banner — DB mode */}
              {hasDraft && sourceMode === 'db' && (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-700/40 bg-amber-900/20 px-3 py-2 text-xs text-amber-400">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Đã khôi phục nháp tự động</span>
                  <button onClick={() => { clearDraft(); setHasDraft(false); setSelectedProduct(null); setSearch(''); setOutputs({}) }} className="text-gray-500 hover:text-red-400 transition text-[10px]">Xóa</button>
                </div>
              )}
            </div>
          )}

          {/* ════════════════ JAPAN URL MODE ════════════════ */}
          {sourceMode === 'japan' && (
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">
                  <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-blue-600 text-white text-[9px] font-black mr-1.5">1</span>
                  Paste URL trang Nhật
                </p>
                <p className="text-[11px] text-gray-500 mb-2">
                  Hỗ trợ: kakaku.com, yodobashi.com, bic.com, joshin.co.jp, ...
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="https://kakaku.com/item/K000... hoặc amazon.co.jp/dp/..."
                      value={japanUrl}
                      onChange={e => setJapanUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && scrapeJapan()}
                      className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 pr-16 text-xs text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                    />
                    <button
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText()
                          if (text.startsWith('http')) setJapanUrl(text.trim())
                        } catch {
                          // browser blocked clipboard access — user can paste manually
                        }
                      }}
                      title="Paste từ clipboard"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-md bg-gray-700 hover:bg-gray-600 px-2 py-1 text-[10px] font-semibold text-gray-300 transition"
                    >
                      <Copy className="h-3 w-3" /> Paste
                    </button>
                  </div>
                  <button
                    onClick={scrapeJapan}
                    disabled={scraping || !japanUrl.trim()}
                    className="shrink-0 flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 transition disabled:opacity-40"
                  >
                    {scraping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
                    {scraping ? 'Đang lấy...' : 'Lấy thông tin'}
                  </button>
                </div>

                {hasDraft && !scrapeError && (
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-amber-700/40 bg-amber-900/20 px-3 py-2 text-xs text-amber-400">
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Đã khôi phục nháp tự động</span>
                    <button onClick={() => { clearDraft(); setHasDraft(false); setJapanProduct(null); setJapanUrl(''); setCompetitorProduct(null); setCompetitorUrl(''); setOutputs({}) }} className="text-gray-500 hover:text-red-400 transition text-[10px]">Xóa</button>
                  </div>
                )}

                {scrapeError && (
                  <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-red-700/40 bg-red-900/20 px-3 py-2 text-xs text-red-400">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {scrapeError}
                  </div>
                )}
              </div>

              {/* Japan product result card */}
              {japanProduct && (
                <div className="rounded-xl border border-blue-700/40 bg-blue-900/10 p-3 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
                        <span className="text-[10px] font-bold text-green-400 uppercase tracking-wide">Đã lấy được thông tin</span>
                      </div>
                      <p className="text-xs text-gray-500 leading-snug line-through">{japanProduct.name}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {japanProduct.model && (
                          <span className="text-[10px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded font-mono">{japanProduct.model}</span>
                        )}
                        {japanProduct.priceJPY && (
                          <span className="text-[10px] bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded font-semibold">
                            ¥{japanProduct.priceJPY.toLocaleString('ja-JP')}
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => { setJapanProduct(null); setScrapeError(''); setJapanUrl(''); setJapanVietName('') }}
                      className="shrink-0 text-gray-500 hover:text-red-400 transition mt-0.5">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Tên tiếng Việt */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-yellow-400 uppercase tracking-wide block">
                        Tên sản phẩm tiếng Việt *
                      </label>
                      <button
                        type="button"
                        onClick={() => translateName()}
                        disabled={translatingName}
                        className="text-[10px] font-bold text-blue-400 hover:text-blue-300 disabled:text-gray-600 transition"
                      >
                        {translatingName ? '⏳ Đang dịch…' : '✨ Dịch tự động'}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={japanVietName}
                      onChange={e => setJapanVietName(e.target.value)}
                      placeholder="VD: Nồi cơm điện IH Tiger 5.5 cups nội địa Nhật"
                      className="w-full text-sm bg-gray-800 border border-yellow-700/50 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500"
                    />
                  </div>

                  {/* Thông số */}
                  {japanProduct.specs.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                        Thông số kỹ thuật ({japanProduct.specs.length} mục)
                      </p>
                      <div className="space-y-0.5 max-h-36 overflow-y-auto pr-1">
                        {japanProduct.specs.map((s, i) => (
                          <div key={i} className="text-[11px] text-gray-400 flex gap-1.5">
                            <span className="text-gray-600 shrink-0">·</span>
                            <span><span className="text-gray-500">{s.name}:</span> <span className="text-gray-300">{s.value}</span></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ảnh sản phẩm — chọn để dùng */}
                  {(japanProduct.images.length > 0 || extraImages.length > 0) && (() => {
                    const allImages = [...japanProduct.images, ...extraImages]
                    return (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                          Ảnh sản phẩm — click để chọn ({selectedImages.size}/{allImages.length})
                        </p>
                        <div className="flex items-center gap-2">
                          {searchImagesMsg && <span className="text-[10px] text-emerald-400">{searchImagesMsg}</span>}
                          <button
                            type="button"
                            onClick={searchMoreImages}
                            disabled={searchingImages}
                            className="flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 disabled:text-gray-600 transition"
                          >
                            {searchingImages
                              ? <><Loader2 className="h-3 w-3 animate-spin" /> Đang tìm…</>
                              : <><Search className="h-3 w-3" /> Tìm thêm ảnh</>}
                          </button>
                        </div>
                      </div>
                      {/* Lấy ảnh tính năng từ trang chính hãng (Playwright, local) + dán URL ảnh thủ công */}
                      <div className="mb-2 space-y-1.5 rounded-lg border border-gray-700 bg-gray-900/40 p-2">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="url"
                            value={featurePageUrl}
                            onChange={e => setFeaturePageUrl(e.target.value)}
                            placeholder="URL trang chính hãng (ảnh giới thiệu tính năng)…"
                            className="flex-1 rounded bg-gray-800 border border-gray-700 px-2 py-1 text-[11px] text-gray-200 outline-none focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={scrapeFeatureImages}
                            disabled={scrapingFeature}
                            className="flex items-center gap-1 rounded bg-blue-600/90 hover:bg-blue-600 disabled:bg-gray-700 px-2 py-1 text-[10px] font-bold text-white transition whitespace-nowrap"
                          >
                            {scrapingFeature ? <><Loader2 className="h-3 w-3 animate-spin" /> Đang lấy…</> : <>Lấy ảnh trang hãng</>}
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="url"
                            value={pasteImageUrl}
                            onChange={e => setPasteImageUrl(e.target.value)}
                            placeholder="Dán URL ảnh trực tiếp (nhiều ảnh cách nhau bằng xuống dòng/dấu phẩy)…"
                            className="flex-1 rounded bg-gray-800 border border-gray-700 px-2 py-1 text-[11px] text-gray-200 outline-none focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={addPastedImages}
                            className="rounded bg-gray-700 hover:bg-gray-600 px-2 py-1 text-[10px] font-bold text-white transition whitespace-nowrap"
                          >
                            Thêm URL
                          </button>
                        </div>
                        {featureMsg && <p className="text-[10px] text-emerald-400">{featureMsg}</p>}
                        <p className="text-[9px] text-gray-500">⚙️ “Lấy ảnh trang hãng” chỉ chạy ở máy local (cần Chrome). Ảnh lấy về sẽ hiện bên dưới để chọn.</p>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {allImages.map((url, i) => {
                          const selected = selectedImages.has(url)
                          const isExtra = i >= japanProduct.images.length
                          return (
                            <button
                              key={url + i}
                              onClick={() => toggleImage(url)}
                              className={`relative rounded-lg overflow-hidden border-2 transition-all aspect-square ${
                                selected ? 'border-blue-500 ring-1 ring-blue-500/40' : 'border-gray-700 opacity-50 hover:opacity-70'
                              }`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={proxyImg(url)} alt="" className="h-full w-full object-cover" />
                              {isExtra && (
                                <span className="absolute top-0.5 left-0.5 rounded bg-blue-600/90 px-1 text-[8px] font-bold text-white">G</span>
                              )}
                              {selected && (
                                <div className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center">
                                  <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    )
                  })()}
                </div>
              )}
            </div>
          )}

          {/* ════════════════ COMPETITOR MODE ════════════════ */}
          {sourceMode === 'competitor' && (
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                  <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-orange-600 text-white text-[9px] font-black mr-1.5">1</span>
                  Paste URL sản phẩm đối thủ
                </p>
                <p className="text-[11px] text-gray-500 mb-2">Tiki, Điện Máy Xanh, MediaMart, Shopee, Lazada, Nguyễn Kim...</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="https://tiki.vn/... hoặc dienmayxanh.com/..."
                      value={competitorUrl}
                      onChange={e => setCompetitorUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && scrapeCompetitor()}
                      className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 pr-16 text-xs text-white placeholder-gray-500 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20"
                    />
                    <button
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText()
                          if (text.startsWith('http')) setCompetitorUrl(text.trim())
                        } catch {
                          // browser blocked clipboard access — user can paste manually
                        }
                      }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-md bg-gray-700 hover:bg-gray-600 px-2 py-1 text-[10px] font-semibold text-gray-300 transition"
                    >
                      <Copy className="h-3 w-3" /> Paste
                    </button>
                  </div>
                  <button
                    onClick={scrapeCompetitor}
                    disabled={scrapingCompetitor || !competitorUrl.trim()}
                    className="shrink-0 flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold text-white hover:bg-orange-700 transition disabled:opacity-40"
                  >
                    {scrapingCompetitor ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
                    {scrapingCompetitor ? 'Đang lấy...' : 'Lấy thông tin'}
                  </button>
                </div>
                {competitorError && (
                  <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-red-700/40 bg-red-900/20 px-3 py-2 text-xs text-red-400">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {competitorError}
                  </div>
                )}
              </div>

              {/* Competitor product card */}
              {competitorProduct && (
                <div className="rounded-xl border border-orange-700/40 bg-orange-900/10 p-3 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
                        <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wide">
                          {competitorProduct.site}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white leading-snug">{competitorProduct.name}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {competitorProduct.brand && (
                          <span className="text-[10px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">{competitorProduct.brand}</span>
                        )}
                        {competitorProduct.price && (
                          <span className="text-[10px] bg-orange-900/50 text-orange-300 px-1.5 py-0.5 rounded font-semibold">
                            {competitorProduct.price.toLocaleString('vi-VN')}₫
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => { setCompetitorProduct(null); setCompetitorError(''); setCompetitorUrl('') }}
                      className="shrink-0 text-gray-500 hover:text-red-400 transition mt-0.5">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {competitorProduct.specs.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                        Thông số ({competitorProduct.specs.length} mục)
                      </p>
                      <div className="space-y-0.5 max-h-32 overflow-y-auto pr-1">
                        {competitorProduct.specs.map((s, i) => (
                          <div key={i} className="text-[11px] text-gray-400 flex gap-1.5">
                            <span className="text-gray-600 shrink-0">·</span>
                            <span><span className="text-gray-500">{s.name}:</span> <span className="text-gray-300">{s.value}</span></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {competitorProduct.images.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                        Ảnh — click để chọn ({selectedCompetitorImages.size}/{competitorProduct.images.length})
                      </p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {competitorProduct.images.map((url, i) => {
                          const selected = selectedCompetitorImages.has(url)
                          return (
                            <button key={i} onClick={() => toggleCompetitorImage(url)}
                              className={`relative rounded-lg overflow-hidden border-2 transition-all aspect-square ${
                                selected ? 'border-orange-500 ring-1 ring-orange-500/40' : 'border-gray-700 opacity-50 hover:opacity-70'
                              }`}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={proxyImg(url)} alt="" className="h-full w-full object-cover" />
                              {selected && (
                                <div className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full bg-orange-500 flex items-center justify-center">
                                  <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg border border-orange-700/30 bg-orange-900/20 px-3 py-2 text-[11px] text-orange-300">
                    ✍️ AI sẽ <strong>viết lại hoàn toàn</strong> theo phong cách Japan VIP — không copy nội dung đối thủ
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════════════ STEP 2: Content types ════════════════ */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">
              <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-brand-red text-white text-[9px] font-black mr-1.5">2</span>
              Loại nội dung
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {CONTENT_TYPES.map(t => {
                const checked = selectedTypes.includes(t.key)
                const isGenerating = loading && currentGenerating === t.key
                const isDone = !loading && !!outputs[t.key]
                return (
                  <button key={t.key} onClick={() => toggleType(t.key)}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-all ${
                      checked ? 'border-brand-red bg-red-900/25' : 'border-gray-700 bg-gray-800/80 hover:border-gray-500'
                    }`}>
                    <span className={`h-3.5 w-3.5 shrink-0 rounded border-2 flex items-center justify-center text-[9px] font-black transition-colors ${
                      checked ? 'border-brand-red bg-brand-red text-white' : 'border-gray-600 bg-transparent text-transparent'
                    }`}>✓</span>
                    <span className="text-sm leading-none">{t.icon}</span>
                    <span className={`text-xs font-semibold truncate ${checked ? 'text-red-400' : 'text-gray-300'}`}>{t.label}</span>
                    {isGenerating && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400 animate-pulse" />}
                    {isDone && <span className="ml-auto text-[10px] text-green-400 shrink-0">✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ════════════════ STEP 3: AI Instruction ════════════════ */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">
              <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-gray-600 text-white text-[9px] font-black mr-1.5">3</span>
              Hướng dẫn thêm <span className="font-normal normal-case text-gray-600">— tùy chọn</span>
            </p>

            <div className="rounded-xl border border-gray-700 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800/80">
                <p className="text-[11px] text-gray-400">{freePromptMode ? '⚡ Prompt tự do' : '💬 Hướng dẫn cho AI'}</p>
                <button onClick={() => setFreePromptMode(v => !v)}
                  className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold border transition-all ${
                    freePromptMode
                      ? 'border-purple-500 bg-purple-900/50 text-purple-300'
                      : 'border-gray-600 bg-gray-700 text-gray-400 hover:text-gray-200'
                  }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${freePromptMode ? 'bg-purple-400' : 'bg-gray-600'}`} />
                  {freePromptMode ? 'Tắt' : 'Prompt tự do'}
                </button>
              </div>
              <div className="p-2.5">
                {!freePromptMode ? (
                  <textarea value={customInstruction} onChange={e => setCustomInstruction(e.target.value)}
                    placeholder={"– Tập trung vào tiết kiệm điện\n– Tone nhẹ hơn, ít số liệu\n– So sánh với hàng Việt Nam"}
                    rows={3}
                    className="w-full resize-none rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-brand-red leading-relaxed"
                  />
                ) : (
                  <>
                    <p className="text-[11px] text-purple-400 mb-1.5">Template bị bỏ qua — viết toàn bộ prompt</p>
                    <textarea value={freePrompt} onChange={e => setFreePrompt(e.target.value)}
                      placeholder={"Viết bảng so sánh dạng HTML..."}
                      rows={5}
                      className="w-full resize-none rounded-lg border border-purple-700/40 bg-gray-800/60 px-3 py-2 text-sm text-purple-100 placeholder-purple-900/60 outline-none focus:border-purple-500 leading-relaxed font-mono"
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* AI Provider selector */}
          <div className="rounded-xl border border-gray-700 bg-gray-800/60 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">AI Engine</p>
            <div className="flex gap-1.5">
              {/* Claude Code */}
              <button
                onClick={() => setAiProvider('claude-code')}
                disabled={!claudeCodeAvailable}
                className={`relative flex-1 flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition disabled:opacity-40 disabled:cursor-not-allowed ${
                  aiProvider === 'claude-code'
                    ? 'border-green-500/50 bg-green-950/50'
                    : 'border-gray-700 bg-gray-900/40 hover:border-gray-600'
                }`}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs ${aiProvider === 'claude-code' ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
                  ✦
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-1 flex-wrap">
                    <span className="text-[11px] font-semibold text-gray-100 whitespace-nowrap">Claude Code</span>
                    {claudeCodeAvailable
                      ? <span className="rounded px-1 py-px text-[9px] font-bold bg-green-500/15 text-green-400 whitespace-nowrap">Miễn phí</span>
                      : <span className="rounded px-1 py-px text-[9px] font-bold bg-red-500/15 text-red-400 whitespace-nowrap">Offline</span>
                    }
                  </span>
                  <span className="block text-[10px] text-gray-500 leading-none mt-0.5 whitespace-nowrap">Subscription Google</span>
                </span>
                {aiProvider === 'claude-code' && (
                  <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-green-400" />
                )}
              </button>

              {/* Anthropic API */}
              <button
                onClick={() => { if (anthropicEnabled) setAiProvider('anthropic') }}
                disabled={!anthropicEnabled}
                className={`relative flex-1 flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition ${
                  !anthropicEnabled
                    ? 'border-gray-800 bg-gray-900/20 opacity-40 cursor-not-allowed'
                    : aiProvider === 'anthropic'
                      ? 'border-purple-500/50 bg-purple-950/50'
                      : 'border-gray-700 bg-gray-900/40 hover:border-gray-600'
                }`}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs ${aiProvider === 'anthropic' && anthropicEnabled ? 'bg-purple-500/20' : 'bg-gray-800'}`}>
                  🔑
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-1">
                    <span className="text-[11px] font-semibold text-gray-100 whitespace-nowrap">Anthropic</span>
                    <span className="rounded px-1 py-px text-[9px] font-bold bg-purple-500/15 text-purple-400 whitespace-nowrap">API Key</span>
                  </span>
                  <span className="block text-[10px] text-gray-500 leading-none mt-0.5 whitespace-nowrap">Tính phí / token</span>
                </span>
                {aiProvider === 'anthropic' && anthropicEnabled && (
                  <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-purple-400" />
                )}
              </button>
            </div>

            {/* Toggle bật/tắt Anthropic */}
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] text-gray-500">Bật / Tắt Anthropic API</span>
              <button
                type="button"
                role="switch"
                aria-checked={anthropicEnabled}
                onClick={() => {
                  const next = !anthropicEnabled
                  setAnthropicEnabled(next)
                  localStorage.setItem('ai_anthropic_enabled', next ? 'true' : 'false')
                  if (!next && aiProvider === 'anthropic') setAiProvider('claude-code')
                }}
                className={`relative inline-flex h-5 w-9 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${anthropicEnabled ? 'bg-purple-500' : 'bg-gray-600'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${anthropicEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>

            {claudeCodeAvailable && aiProvider === 'claude-code' && (
              <div className="mt-2 space-y-1.5">
                <p className="text-[10px] text-green-600">⚡ Kết nối Google · Không tốn API credit</p>
                <select
                  value={claudeCodeModel}
                  onChange={e => { setClaudeCodeModel(e.target.value); localStorage.setItem('ai_claude_code_model', e.target.value) }}
                  className="w-full px-2 py-1.5 rounded-md bg-gray-900 border border-gray-700 text-gray-200 text-[11px] focus:outline-none focus:border-green-500"
                >
                  <option value="claude-opus-4-8">Opus 4.8 (mạnh nhất)</option>
                  <option value="claude-sonnet-4-6">Sonnet 4.6 (cân bằng)</option>
                  <option value="claude-haiku-4-5-20251001">Haiku 4.5 (nhanh nhất)</option>
                </select>
              </div>
            )}
          </div>

          {/* Word limit */}
          <div className="rounded-xl border border-gray-700 bg-gray-800/60 px-3 py-2.5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-xs font-semibold text-gray-300">Giới hạn số từ / bài</span>
              </div>
              <span className="text-xs font-bold text-brand-red tabular-nums">{maxWords.toLocaleString()} từ</span>
            </div>
            <input
              type="range"
              min={500}
              max={10000}
              step={100}
              value={maxWords}
              onChange={e => setMaxWords(Number(e.target.value))}
              className="w-full h-1.5 appearance-none rounded-full bg-gray-700 accent-brand-red cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>500</span>
              <span>2.500</span>
              <span>5.000</span>
              <span>7.500</span>
              <span>10.000</span>
            </div>
          </div>
        </div>

        {/* Generate button */}
        <div className="p-4 border-t border-gray-700">
          {/* Cost estimate */}
          {costEstimate && !loading && (
            <div className="mb-2 flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-2 text-xs">
              <span className="text-gray-400">Ước tính chi phí lần này</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-400">
                  ~{Math.ceil(costEstimate.vnd).toLocaleString('vi-VN')}₫
                </span>
                <span className="text-gray-600 text-[10px]">(${costEstimate.usd.toFixed(4)})</span>
              </div>
            </div>
          )}
          {/* Test mode toggle */}
          <label className="flex items-center gap-2 cursor-pointer mb-1.5 select-none">
            <div
              onClick={() => setTestMode(v => !v)}
              className={`relative w-9 h-5 rounded-full transition-colors ${testMode ? 'bg-yellow-500' : 'bg-gray-700'}`}
            >
              <div className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${testMode ? 'translate-x-4' : ''}`} />
            </div>
            <span className="text-[11px] text-gray-400">
              {testMode ? <span className="text-yellow-400 font-semibold">⚡ Test nhanh (~300 từ)</span> : 'Test nhanh'}
            </span>
          </label>

          {loading ? (
            <div className="flex gap-2">
              <div className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white bg-gray-700 cursor-default select-none">
                <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
                <span className="text-gray-300">Đang tạo nội dung...</span>
              </div>
              <button
                onClick={stopGenerate}
                className="shrink-0 flex items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-sm font-bold text-white bg-red-600 hover:bg-red-500 transition"
                title="Dừng generate"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                Dừng
              </button>
            </div>
          ) : (
            <button
              onClick={generate}
              disabled={!hasSource || loadingProduct || scraping}
              className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition disabled:opacity-40 disabled:cursor-not-allowed ${testMode ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-brand-red hover:bg-red-700'}`}
            >
              {testMode ? (
                <><Sparkles className="h-4 w-4" /> Tạo thử (~300 từ)</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Tạo nội dung với AI</>
              )}
            </button>
          )}
          {!hasSource && !loading && !scraping && (
            <p className="text-center text-[11px] text-gray-600 mt-2">
              {sourceMode === 'db' ? 'Chọn sản phẩm ở bước 1 trước' : 'Paste URL và lấy thông tin trước'}
            </p>
          )}

          {/* Publish button — Competitor mode */}
          {sourceMode === 'competitor' && competitorProduct && Object.keys(outputs).length > 0 && !loading && (
            <div className="mt-2 space-y-2">
              {cpubStatus !== 'done' ? (
                <button
                  onClick={publishCompetitor}
                  disabled={cpubStatus === 'publishing'}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-orange-500 bg-orange-900/30 py-3 text-sm font-bold text-orange-300 hover:bg-orange-900/60 transition disabled:opacity-40"
                >
                  {cpubStatus === 'publishing' ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Đang lưu nháp sản phẩm...</>
                  ) : cpubStatus === 'error' ? (
                    <><PackagePlus className="h-4 w-4" /> Lỗi — Thử lại</>
                  ) : (
                    <><PackagePlus className="h-4 w-4" /> Lưu nháp &amp; xem trên web</>
                  )}
                </button>
              ) : (
                <div className="rounded-xl border border-green-600/50 bg-green-900/20 p-3 space-y-2">
                  <p className="text-xs font-bold text-green-400 text-center">✓ Đã lưu nháp thành công!</p>
                  {cpubId && (
                    <a
                      href={`/admin/products/${cpubId}`}
                      className="flex items-center justify-center gap-2 w-full rounded-lg bg-green-600 hover:bg-green-700 py-2.5 text-sm font-bold text-white transition"
                    >
                      <ExternalLink className="h-4 w-4" /> Mở sản phẩm để duyệt đăng
                    </a>
                  )}
                  {cpubSlug && (
                    <a
                      href={`/${cpubSlug}`}
                      target="_blank"
                      className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-300 transition"
                    >
                      <ExternalLink className="h-3 w-3" /> Xem thử trang sản phẩm trên web
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Right panel: Output ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-900">

        {/* Toolbar */}
        <div className="border-b border-gray-700 bg-gray-800 px-5 py-3 shrink-0">
          {selectedTypes.length > 1 && (
            <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
              {selectedTypes.map(key => {
                const t = CONTENT_TYPES.find(ct => ct.key === key)!
                const hasOutput = !!outputs[key]
                const isGen = loading && currentGenerating === key
                return (
                  <button key={key} onClick={() => setActiveTab(key)}
                    className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      activeTab === key ? 'bg-brand-red text-white' : 'bg-gray-700 text-gray-400 hover:text-gray-200'
                    }`}>
                    {t.icon} {t.label}
                    {isGen && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />}
                    {hasOutput && !isGen && <span className="text-green-400">✓</span>}
                  </button>
                )
              })}
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-200">{currentType.icon} {currentType.label}</span>
              {loading && currentGenerating === activeTab && (
                <span className="flex items-center gap-1 rounded-full bg-amber-900/40 border border-amber-700/50 px-2 py-0.5 text-xs text-amber-400 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" /> Đang sinh...
                </span>
              )}
              {loading && currentGenerating !== activeTab && currentGenerating && (
                <span className="text-xs text-gray-500">
                  (đang tạo: {CONTENT_TYPES.find(t => t.key === currentGenerating)?.label})
                </span>
              )}
              {!loading && output && (
                <span className="rounded-full bg-green-900/40 border border-green-700/50 px-2 py-0.5 text-xs text-green-400 font-medium">
                  ✓ {output.length.toLocaleString()} ký tự
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentType.outputType === 'html' && output && (
                <div className="flex rounded-lg border border-gray-600 overflow-hidden text-xs font-semibold">
                  <button onClick={() => setViewMode('code')}
                    className={`flex items-center gap-1 px-3 py-1.5 transition ${viewMode === 'code' ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'}`}>
                    <Code2 className="h-3 w-3" /> Code
                  </button>
                  <button onClick={() => setViewMode('preview')}
                    className={`flex items-center gap-1 px-3 py-1.5 transition ${viewMode === 'preview' ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'}`}>
                    <Eye className="h-3 w-3" /> Preview
                  </button>
                </div>
              )}
              <button onClick={() => navigator.clipboard.writeText(output)} disabled={!output}
                className="flex items-center gap-1.5 rounded-lg border border-gray-600 bg-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:border-gray-500 transition disabled:opacity-30">
                <Copy className="h-3.5 w-3.5" /> Copy
              </button>
              {selectedProduct && output && (activeTab === 'description' || activeTab === 'faq' || activeTab === 'seo') && (
                <button onClick={saveToProduct} disabled={saveStatus === 'saving'}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    saveStatus === 'saved' ? 'bg-green-600 text-white' :
                    saveStatus === 'error' ? 'bg-red-900/50 text-red-400 border border-red-700' :
                    'bg-brand-red text-white hover:bg-red-700'
                  }`}>
                  <Save className="h-3.5 w-3.5" />
                  {saveStatus === 'saving' ? 'Đang lưu...' : saveStatus === 'saved' ? '✓ Đã lưu!' : saveStatus === 'error' ? '✕ Lỗi' : 'Lưu vào sản phẩm'}
                </button>
              )}
              {/* Nút mở sản phẩm — hiện ngay trong toolbar sau khi lưu/publish xong */}
              {sourceMode === 'db' && selectedProduct && saveStatus === 'saved' && (
                <a
                  href={`/admin/products/${selectedProduct.id}`}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold bg-green-600 text-white hover:bg-green-700 transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Mở sản phẩm
                </a>
              )}
              {/* Lưu nháp SẢN PHẨM — chỉ ở các tab nội dung sản phẩm (KHÔNG ở tab Blog/Social/Email/Video/So sánh) */}
              {sourceMode === 'japan' && ['description', 'faq', 'attributes', 'seo'].includes(activeTab) && Object.keys(outputs).length > 0 && !loading && publishStatus !== 'done' && (
                <button
                  onClick={publishProduct}
                  disabled={publishStatus === 'publishing'}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {publishStatus === 'publishing' ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang lưu...</>
                  ) : publishStatus === 'error' ? (
                    <><PackagePlus className="h-3.5 w-3.5" /> Lỗi — Thử lại</>
                  ) : (
                    <><PackagePlus className="h-3.5 w-3.5" /> Lưu nháp</>
                  )}
                </button>
              )}

              {/* Lưu vào BLOG — khi đang ở tab Bài viết Blog (mọi nguồn) */}
              {activeTab === 'blog' && output && !loading && blogSaveStatus !== 'done' && (
                <button
                  onClick={saveBlog}
                  disabled={blogSaveStatus === 'saving'}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition disabled:opacity-50"
                >
                  {blogSaveStatus === 'saving' ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang lưu...</>
                  ) : blogSaveStatus === 'error' ? (
                    <><Save className="h-3.5 w-3.5" /> Lỗi — Thử lại</>
                  ) : (
                    <><Save className="h-3.5 w-3.5" /> Lưu vào Blog</>
                  )}
                </button>
              )}
              {activeTab === 'blog' && blogSaveStatus === 'done' && blogPostId && (
                <a
                  href={`/admin/content/blog/${blogPostId}`}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold bg-green-600 text-white hover:bg-green-700 transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Mở bài Blog
                </a>
              )}

              {sourceMode === 'japan' && publishStatus === 'done' && publishedId && (
                <a
                  href={`/admin/products/${publishedId}`}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold bg-green-600 text-white hover:bg-green-700 transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Mở sản phẩm
                </a>
              )}
              {sourceMode === 'competitor' && cpubStatus === 'done' && cpubId && (
                <a
                  href={`/admin/products/${cpubId}`}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold bg-green-600 text-white hover:bg-green-700 transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Mở sản phẩm
                </a>
              )}
              {Object.keys(outputs).length > 0 && !loading && (
                <button
                  onClick={() => {
                    clearDraft()
                    setOutputs({})
                    setJapanProduct(null); setJapanUrl(''); setJapanVietName('')
                    setSelectedProduct(null); setSearch('')
                    setCompetitorProduct(null); setCompetitorUrl('')
                    setPublishStatus('idle'); setPublishedId(null); setPublishedSlug(null)
                    setCpubStatus('idle'); setCpubId(null); setCpubSlug(null)
                    setSaveStatus('idle'); setHasDraft(false)
                  }}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-400 hover:text-red-400 hover:bg-red-900/20 border border-gray-700 hover:border-red-800 transition"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Bắt đầu mới
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Output area */}
        <div className="flex-1 overflow-hidden p-5">
          {!output && !loading ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-800 text-3xl">
                {sourceMode === 'japan' ? '🇯🇵' : sourceMode === 'competitor' ? '🏪' : '✨'}
              </div>
              <p className="text-base font-semibold text-gray-300">Sẵn sàng tạo nội dung</p>
              <p className="mt-1 text-sm text-gray-500">
                {sourceMode === 'competitor'
                  ? hasSource
                    ? <>Chọn loại nội dung và nhấn <strong className="text-gray-300">Tạo nội dung</strong></>
                    : <>Paste URL sản phẩm đối thủ và nhấn <strong className="text-gray-300">Lấy thông tin</strong></>
                  : sourceMode === 'japan'
                    ? hasSource
                      ? <>Chọn loại nội dung và nhấn <strong className="text-gray-300">Tạo nội dung</strong></>
                      : <>Paste URL trang Nhật và nhấn <strong className="text-gray-300">Lấy thông tin</strong></>
                    : hasSource
                      ? <>Chọn loại nội dung và nhấn <strong className="text-gray-300">Tạo nội dung</strong></>
                      : <>Tìm và chọn sản phẩm ở cột trái để bắt đầu</>
                }
              </p>
              {sourceMode === 'japan' && !hasSource && (
                <div className="mt-4 rounded-xl border border-gray-700 bg-gray-800/50 px-6 py-4 text-left max-w-sm">
                  <p className="text-xs font-semibold text-gray-300 mb-2">Ví dụ URL hỗ trợ:</p>
                  <ul className="space-y-1 text-xs text-gray-500">
                    <li>· kakaku.com/item/K0001719424/</li>
                    <li>· amazon.co.jp/dp/B0XXXXXXXX/</li>
                    <li>· yodobashi.com/product/...</li>
                    <li>· rakuten.co.jp/shop/item/</li>
                    <li>· bic.com / joshin.co.jp / ...</li>
                  </ul>
                </div>
              )}
            </div>
          ) : viewMode === 'preview' && currentType.outputType === 'html' ? (
            <div className="h-full overflow-y-auto rounded-xl border border-gray-700 bg-white p-6">
              <div
                className="prose prose-sm max-w-none text-gray-700 leading-7
                  [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul_li]:mb-1
                  [&_strong]:font-semibold [&_strong]:text-gray-900
                  [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:border-l-4 [&_h2]:border-brand-red [&_h2]:pl-4
                  [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-gray-900 [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:border-l-4 [&_h3]:border-blue-400 [&_h3]:pl-3
                  [&_blockquote]:not-italic [&_blockquote]:border-l-4 [&_blockquote]:border-amber-400 [&_blockquote]:bg-amber-50 [&_blockquote]:px-5 [&_blockquote]:py-3 [&_blockquote]:rounded-r-lg [&_blockquote]:text-amber-900 [&_blockquote]:my-5 [&_blockquote]:text-sm
                  [&_.compare-grid]:grid [&_.compare-grid]:grid-cols-3 [&_.compare-grid]:gap-3 [&_.compare-grid]:my-5 [&_.compare-grid]:text-center [&_.compare-grid]:text-sm
                  [&_.compare-box]:rounded-xl [&_.compare-box]:border [&_.compare-box]:px-3 [&_.compare-box]:py-4
                  [&_.compare-val]:block [&_.compare-val]:text-2xl [&_.compare-val]:font-extrabold [&_.compare-val]:mb-1"
                dangerouslySetInnerHTML={{ __html: output }}
              />
            </div>
          ) : (
            <textarea
              ref={outputRef}
              value={output}
              onChange={e => setOutputs(prev => ({ ...prev, [activeTab]: e.target.value }))}
              className="h-full w-full resize-none rounded-xl border border-gray-700 bg-gray-800 p-5 font-mono text-sm text-gray-200 outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/30 leading-relaxed"
              placeholder="Nội dung AI sẽ xuất hiện ở đây..."
            />
          )}
        </div>
      </div>
    </div>
  )
}
