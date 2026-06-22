import { translate as googleFreeTranslate } from '@vitalets/google-translate-api'
import { prisma } from '@japanvip/db'
import { decryptIfNeeded } from '@/lib/encrypt'

type Provider = 'anthropic' | 'google' | 'google-free' | 'none'

// Katakana brand names → Latin (normalize BEFORE sending to translation)
const KATAKANA_BRAND_MAP: Record<string, string> = {
  'パナソニック': 'Panasonic',
  'シャープ': 'Sharp',
  'ソニー': 'Sony',
  'ヒタチ': 'Hitachi',
  'トウシバ': 'Toshiba',
  '東芝': 'Toshiba',
  '日立': 'Hitachi',
  'ミツビシ': 'Mitsubishi',
  '三菱': 'Mitsubishi',
  'フジツウ': 'Fujitsu',
  'ダイキン': 'Daikin',
  'キヤノン': 'Canon',
  'ニコン': 'Nikon',
  'ヤマハ': 'Yamaha',
  'カシオ': 'Casio',
  'セイコー': 'Seiko',
  'アイリスオーヤマ': 'Iris Ohyama',
  'リンナイ': 'Rinnai',
  'タイガー': 'Tiger',
  'ゾウジルシ': 'Zojirushi',
  '象印': 'Zojirushi',
  'マキタ': 'Makita',
  'ダイソン': 'Dyson',
  'フィリップス': 'Philips',
  'ブラウン': 'Braun',
  'ヤマゼン': 'YAMAZEN',
  'シムニー': 'Simunii',
  'アクア': 'Aqua',
  'ハイアール': 'Haier',
  'コロナ': 'Corona',
  'トヨトミ': 'Toyotomi',
}

// Common Japanese appliance terms → Vietnamese (replace BEFORE translation)
const JP_TERM_MAP: Record<string, string> = {
  // Capacity / Size
  '3合': '3 chén',
  '5合': '5 chén',
  '1升': '10 chén',
  '0.5合': '0.5 chén',
  '一人暮らし': 'dành cho 1 người',
  '二人暮らし': 'dành cho 2 người',
  '1人暮らし': 'dành cho 1 người',
  '2人暮らし': 'dành cho 2 người',
  // Rice cooker features
  'マイコン式': 'vi tính',
  'IH式': 'IH',
  '圧力IH': 'IH áp suất',
  '予約機能': 'hẹn giờ',
  '予約': 'hẹn giờ',
  '保温': 'giữ ấm',
  '早炊き': 'nấu nhanh',
  '白米': 'gạo trắng',
  '無洗米': 'gạo không cần vo',
  '雑穀米': 'gạo lứt hỗn hợp',
  'おかゆ': 'cháo',
  'パン調理': 'nấu bánh mì',
  // Colors
  'ブラック': 'Đen',
  'ホワイト': 'Trắng',
  'シルバー': 'Bạc',
  'レッド': 'Đỏ',
  'ゴールド': 'Vàng',
  'ネイビー': 'Xanh navy',
  'グレー': 'Xám',
  'ベージュ': 'Be',
  'ピンク': 'Hồng',
  '白': 'Trắng',
  '黒': 'Đen',
  '赤': 'Đỏ',
  '青': 'Xanh',
  // Common specs
  'フッ素コート': 'chống dính teflon',
  '内釜': 'nồi bên trong',
  'タッチパネル': 'màn hình cảm ứng',
  'コンパクト': 'nhỏ gọn',
  '軽量': 'nhẹ',
  '省エネ': 'tiết kiệm điện',
  '静音': 'yên tĩnh',
  '自動': 'tự động',
  // Washing machine — compound first, then parts
  'ドラム式洗濯乾燥機': 'Máy giặt sấy lồng ngang',
  'ドラム式洗濯機': 'Máy giặt lồng ngang',
  '縦型洗濯乾燥機': 'Máy giặt sấy lồng đứng',
  'ドラム式': 'lồng ngang',
  '縦型': 'lồng đứng',
  '乾燥': 'sấy',
  '脱水': 'vắt',
  '洗濯容量': 'dung tích giặt',
  // Fridge
  '6ドア': '6 cánh',
  '5ドア': '5 cánh',
  '4ドア': '4 cánh',
  '2ドア': '2 cánh',
  'フロスト': 'chống đóng tuyết',
  '自動製氷': 'làm đá tự động',
  // AC
  '冷暖房': 'điều hòa 2 chiều',
  '暖房': 'sưởi',
  '冷房': 'làm lạnh',
  'インバーター': 'inverter',
  // Robots
  'ロボット': 'Robot',
  // Appliance types
  '炊飯器': 'Nồi cơm điện',
  '電子レンジ': 'Lò vi sóng',
  'オーブンレンジ': 'Lò vi sóng có nướng',
  '洗濯乾燥機': 'Máy giặt sấy',
  '洗濯機': 'Máy giặt',
  '乾燥機': 'Máy sấy',
  '冷蔵庫': 'Tủ lạnh',
  '冷凍庫': 'Tủ đông',
  '掃除機': 'Máy hút bụi',
  'ロボット掃除機': 'Robot hút bụi',
  '空気清浄機': 'Máy lọc không khí',
  '除湿機': 'Máy hút ẩm',
  '加湿器': 'Máy tạo ẩm',
  'エアコン': 'Điều hòa',
  '扇風機': 'Quạt điện',
  'ヒーター': 'Máy sưởi',
  'ドライヤー': 'Máy sấy tóc',
  '電動歯ブラシ': 'Bàn chải điện',
  'ケトル': 'Ấm đun nước',
  'コーヒーメーカー': 'Máy pha cà phê',
  'トースター': 'Lò nướng bánh mì',
  '食洗機': 'Máy rửa bát',
  '浄水器': 'Máy lọc nước',
  'エアフライヤー': 'Nồi chiên không dầu',
  '圧力鍋': 'Nồi áp suất',
  'ミキサー': 'Máy xay sinh tố',
  'テレビ': 'TV',
  'プロジェクター': 'Máy chiếu',
  'スピーカー': 'Loa',
  'イヤホン': 'Tai nghe',
  'ヘッドホン': 'Tai nghe chụp tai',
  'プリンター': 'Máy in',
  // Time / numbers
  '24時間': '24 giờ',
  '12時間': '12 giờ',
  '時間': 'giờ',
  // General
  '対応': 'tương thích',
  '機能': 'chức năng',
  '搭載': 'tích hợp',
  '付き': 'có kèm',
  '株式会社': '',
}

// Known Japanese appliance brands — never translate these
const BRAND_PATTERNS = [
  'Panasonic', 'Hitachi', 'Toshiba', 'Sharp', 'Mitsubishi', 'Fujitsu', 'Daikin',
  'Sony', 'Canon', 'Nikon', 'Olympus', 'Casio', 'Seiko', 'Citizen',
  'Yamaha', 'Roland', 'Kawai',
  'Toyota', 'Honda', 'Suzuki', 'Yamaha',
  'Iris Ohyama', 'Iris', 'Ohyama',
  'Rinnai', 'Paloma', 'Noritz',
  'Tiger', 'Zojirushi', 'Aroma', 'Cuckoo',
  'Makita', 'Hikoki', 'Bosch', 'Dewalt',
  'Muji', 'Cainz', 'Nitori',
  'Apple', 'Samsung', 'LG', 'Philips', 'Dyson', 'Roomba', 'iRobot',
  'Braun', 'Oral-B', 'Gillette',
]

// Unit mappings JP/EN → Vietnamese
const UNIT_MAP: Record<string, string> = {
  'kg': 'kg', 'g': 'g', 'mg': 'mg',
  'L': 'lít', 'liter': 'lít', 'litre': 'lít', 'ml': 'ml',
  'W': 'W', 'kW': 'kW', 'Wh': 'Wh', 'kWh': 'kWh',
  'V': 'V', 'A': 'A', 'Hz': 'Hz',
  'cm': 'cm', 'mm': 'mm', 'm': 'm', 'inch': 'inch',
  '℃': '°C', '°C': '°C', '°F': '°F',
  'dB': 'dB', 'db': 'dB',
  'rpm': 'rpm', 'RPM': 'rpm',
}

// Product category keyword mappings (Japanese/English → Vietnamese)
const CATEGORY_MAP: Record<string, string> = {
  // Kitchen
  '冷蔵庫': 'Tủ lạnh', 'refrigerator': 'Tủ lạnh', 'fridge': 'Tủ lạnh',
  '電子レンジ': 'Lò vi sóng', 'microwave': 'Lò vi sóng',
  'オーブンレンジ': 'Lò vi sóng có nướng',
  '炊飯器': 'Nồi cơm điện', 'rice cooker': 'Nồi cơm điện',
  '食洗機': 'Máy rửa bát', 'dishwasher': 'Máy rửa bát',
  '浄水器': 'Máy lọc nước', 'water purifier': 'Máy lọc nước',
  'ケトル': 'Ấm đun nước', 'kettle': 'Ấm đun nước',
  'コーヒーメーカー': 'Máy pha cà phê', 'coffee maker': 'Máy pha cà phê',
  'トースター': 'Lò nướng bánh mì', 'toaster': 'Lò nướng bánh mì',
  'IHクッキングヒーター': 'Bếp từ', 'induction': 'Bếp từ', 'IH': 'Bếp từ',
  'ガスコンロ': 'Bếp gas',
  'フードプロセッサー': 'Máy xay thực phẩm', 'food processor': 'Máy xay',
  'ミキサー': 'Máy xay sinh tố', 'blender': 'Máy xay sinh tố',
  // Laundry & Cleaning
  '洗濯機': 'Máy giặt', 'washing machine': 'Máy giặt', 'washer': 'Máy giặt',
  'drum washing': 'Máy giặt lồng ngang', 'drum washer': 'Máy giặt lồng ngang',
  'front load': 'Máy giặt lồng ngang', 'top load': 'Máy giặt lồng đứng',
  'ドラム式洗濯': 'Máy giặt lồng ngang', 'ドラム式': 'lồng ngang',
  '乾燥機': 'Máy sấy quần áo', 'dryer': 'Máy sấy',
  '洗濯乾燥機': 'Máy giặt sấy',
  '掃除機': 'Máy hút bụi', 'vacuum cleaner': 'Máy hút bụi', 'vacuum': 'Máy hút bụi',
  'ロボット掃除機': 'Robot hút bụi', 'robot vacuum': 'Robot hút bụi',
  // Air & Climate
  'エアコン': 'Máy điều hòa', 'air conditioner': 'Điều hòa', 'AC': 'Điều hòa',
  '空気清浄機': 'Máy lọc không khí', 'air purifier': 'Máy lọc không khí',
  '除湿機': 'Máy hút ẩm', 'dehumidifier': 'Máy hút ẩm',
  '加湿器': 'Máy tạo ẩm', 'humidifier': 'Máy tạo ẩm',
  '扇風機': 'Quạt điện', 'fan': 'Quạt',
  'サーキュレーター': 'Quạt tuần hoàn', 'circulator': 'Quạt tuần hoàn',
  'ヒーター': 'Máy sưởi', 'heater': 'Máy sưởi',
  'ストーブ': 'Lò sưởi',
  // Personal care
  'ドライヤー': 'Máy sấy tóc', 'hair dryer': 'Máy sấy tóc',
  '電動歯ブラシ': 'Bàn chải điện', 'electric toothbrush': 'Bàn chải điện',
  'シェーバー': 'Máy cạo râu', 'shaver': 'Máy cạo râu', 'razor': 'Máy cạo râu',
  '脱毛器': 'Máy triệt lông',
  'マッサージ': 'Máy massage', 'massager': 'Máy massage',
  // Electronics
  'テレビ': 'TV', 'television': 'TV',
  'プロジェクター': 'Máy chiếu', 'projector': 'Máy chiếu',
  'スピーカー': 'Loa', 'speaker': 'Loa',
  'イヤホン': 'Tai nghe nhét tai', 'earphone': 'Tai nghe', 'earbuds': 'Tai nghe',
  'ヘッドホン': 'Tai nghe chụp tai', 'headphone': 'Tai nghe',
  'カメラ': 'Máy ảnh', 'camera': 'Máy ảnh',
  'プリンター': 'Máy in', 'printer': 'Máy in',
  'ルーター': 'Router WiFi', 'router': 'Router',
  // Bathroom
  '温水洗浄便座': 'Bồn cầu rửa', 'bidet': 'Bồn cầu rửa',
  'シャワー': 'Vòi hoa sen', 'shower': 'Sen tắm',
  // Fitness
  'ルームランナー': 'Máy chạy bộ', 'treadmill': 'Máy chạy bộ',
  // Cooking appliances
  'エアフライヤー': 'Nồi chiên không dầu', 'air fryer': 'Nồi chiên không dầu',
  '圧力鍋': 'Nồi áp suất', 'pressure cooker': 'Nồi áp suất',
}

// Placeholder pattern for protected tokens
const PLACEHOLDER_PREFIX = '§§'
const PLACEHOLDER_SUFFIX = '§§'

/**
 * Extract tokens that must not be translated:
 * - Brand names
 * - Model/part numbers (e.g. NA-VX9900L, EH-NA9J, HC-V750M)
 * - Numeric specs with units (e.g. 6.0kg, 500W, 2.5L)
 */
function extractProtectedTokens(text: string): { cleaned: string; tokens: Map<string, string> } {
  const tokens = new Map<string, string>()
  let idx = 0
  let result = text

  function protect(pattern: RegExp, flags = 'g') {
    result = result.replace(new RegExp(pattern, flags), (match) => {
      const key = `${PLACEHOLDER_PREFIX}${idx++}${PLACEHOLDER_SUFFIX}`
      tokens.set(key, match)
      return key
    })
  }

  // 1. Model numbers: dashed like NA-VX9900L, or short alpha+digit like V15, V11, S9+
  protect(/\b[A-Z]{1,4}-[A-Z0-9]{2,}[A-Z0-9-]*\b/)
  protect(/\b[A-Z]{1,3}\d{1,4}[A-Z+]?\b/)

  // 2. Numeric specs with units: 6.0kg, 500W, 2.5L, 50Hz, 220V
  protect(/\d+\.?\d*\s*(?:kg|g|mg|kWh|Wh|kW|W|Hz|V|A|cm|mm|inch|dB|rpm|liter|litre|ml|L|℃|°C|°F)\b/i)

  // 3. Brand names (case-insensitive, word boundaries)
  for (const brand of BRAND_PATTERNS) {
    const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    protect(new RegExp(`\\b${escaped}\\b`, 'i'))
  }

  // 4. Pure numbers (standalone, not already protected)
  protect(/\b\d{4,}\b/)

  return { cleaned: result, tokens }
}

function restoreProtectedTokens(translated: string, tokens: Map<string, string>): string {
  let result = translated
  for (const [key, value] of tokens) {
    result = result.replaceAll(key, value)
  }
  return result
}

/**
 * Normalize Japanese text before translation:
 * 1. Replace katakana brand names with Latin equivalents
 * 2. Replace common JP appliance terms with Vietnamese
 */
function normalizeJapanese(text: string): string {
  let result = text

  // Replace katakana brands first
  for (const [jp, latin] of Object.entries(KATAKANA_BRAND_MAP)) {
    result = result.replaceAll(jp, latin)
  }

  // Replace common JP terms with Vietnamese — wrap with spaces to prevent concatenation
  for (const [jp, vi] of Object.entries(JP_TERM_MAP)) {
    result = result.replaceAll(jp, vi ? ` ${vi} ` : '')
  }

  // Clean up extra spaces
  return result.replace(/\s{2,}/g, ' ').trim()
}

/**
 * Try to map Japanese/English category keywords directly without API call.
 * Returns null if no mapping found.
 */
function mapCategoryKeywords(text: string): string | null {
  for (const [jp, vi] of Object.entries(CATEGORY_MAP)) {
    if (text.toLowerCase().includes(jp.toLowerCase())) {
      return vi
    }
  }
  return null
}

/**
 * Decode HTML entities left by Google Translate
 */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

/**
 * Post-process translated text: fix spacing, units, casing
 */
function postProcess(text: string): string {
  let result = decodeHtmlEntities(text)

  // Restore unit abbreviations that Google may have translated (e.g. "ki-lô-gam" → "kg")
  for (const [en, vi] of Object.entries(UNIT_MAP)) {
    result = result.replace(new RegExp(`\\b${vi}\\b`, 'gi'), en)
  }

  // Ensure space between Vietnamese words that got concatenated (e.g. "ngangMáy" → "ngang Máy")
  result = result.replace(/([a-záàảãạăắằẳẵặâấầẩẫậđéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ])([A-ZÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴ])/g, '$1 $2')

  // Fix double spaces
  result = result.replace(/\s{2,}/g, ' ').trim()

  // Remove duplicate consecutive words (e.g. "Simunii(Simunii)" keep only first)
  result = result.replace(/\b(\w+)\s*\(\1\)/gi, '$1')

  // Capitalize first letter
  result = result.charAt(0).toUpperCase() + result.slice(1)

  return result
}

async function translateViaMyMemory(text: string): Promise<string> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ja|vi`
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`MyMemory ${res.status}`)
  const data = await res.json()
  const translated: string = data?.responseData?.translatedText ?? ''
  if (!translated || translated === text) throw new Error('MyMemory: no translation')
  return translated
}

async function translateViaGoogleFree(text: string): Promise<string> {
  if (!text.trim()) return text

  const { cleaned, tokens } = extractProtectedTokens(text)

  const remainingText = cleaned.replace(/§§\d+§§/g, '').replace(/\s+/g, ' ').trim()
  if (!remainingText || remainingText.length < 2) {
    return restoreProtectedTokens(text, tokens)
  }

  try {
    const translated = await googleFreeTranslate(cleaned, { from: 'auto', to: 'vi' })
    const raw = translated.text?.trim() || cleaned
    return postProcess(restoreProtectedTokens(raw, tokens))
  } catch {
    // Google rate limited — fallback to MyMemory
    const raw = await translateViaMyMemory(cleaned)
    return postProcess(restoreProtectedTokens(raw, tokens))
  }
}

/**
 * Translate product name only — focused, short text
 */
/** Extract capacity (L/ml/lít) from product name */
function extractCapacity(text: string): string | null {
  // Match: 1.0L, 1.5L, 0.54L, 500ml, 1000ml, 10L (for washing machines)
  const match = text.match(/\b(\d+\.?\d*)\s*(ml|ML|L|l|リットル|ℓ)\b/)
  if (!match) return null
  const value = parseFloat(match[1]!)
  const unit = match[2]!.toLowerCase()
  if (unit === 'ml') {
    // Convert ml to L if >= 1000ml
    return value >= 1000 ? `${(value / 1000).toFixed(1)}L` : `${value}ml`
  }
  return `${value}L`
}

/** Extract model number from product name */
function extractModel(text: string): string | null {
  // Dashed model: NA-VX9900L, KS-CF05B-B, R-HW60R
  const dashed = text.match(/\b[A-Z]{1,5}-[A-Z0-9][-A-Z0-9()]*\b/)
  if (dashed) return dashed[0]
  // Short model: KRC-33WH, IC-FAC2, V15
  const short = text.match(/\b[A-Z]{1,3}[A-Z0-9]{2,}-[A-Z0-9]+\b|\b[A-Z]{2,4}\d{2,}[A-Z]?\b/)
  return short ? short[0] : null
}

/** Extract brand from product name (Latin or katakana) */
function extractBrand(original: string, normalized: string): string | null {
  // Check Latin brands in normalized text
  for (const brand of BRAND_PATTERNS) {
    const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(normalized)) return brand
  }
  // Check katakana → latin mapping
  for (const [jp, latin] of Object.entries(KATAKANA_BRAND_MAP)) {
    if (original.includes(jp)) return latin
  }
  return null
}

/** Extract product type (loại sản phẩm) from JP_TERM_MAP appliance types */
function extractProductType(original: string): string | null {
  const applianceKeys = [
    'ロボット掃除機','洗濯乾燥機','ドラム式洗濯乾燥機','ドラム式洗濯機',
    '炊飯器','電子レンジ','オーブンレンジ','食洗機','浄水器','ケトル',
    'コーヒーメーカー','トースター','エアフライヤー','圧力鍋','ミキサー',
    '洗濯機','乾燥機','冷蔵庫','冷凍庫','掃除機',
    '空気清浄機','除湿機','加湿器','エアコン','扇風機','ヒーター',
    'ドライヤー','電動歯ブラシ','プリンター','テレビ','プロジェクター',
    'スピーカー','イヤホン','ヘッドホン',
  ]
  for (const key of applianceKeys) {
    if (original.includes(key)) return JP_TERM_MAP[key] ?? null
  }
  // English fallback
  for (const [en, vi] of Object.entries(CATEGORY_MAP)) {
    if (original.toLowerCase().includes(en.toLowerCase())) return vi
  }
  return null
}

function extractCapacityFromSpecs(specs: { label: string; value: string }[]): string | null {
  // Priority: dehumidification capacity > tank volume (more relevant to product description)
  const dehumidLabels = /水分除去|除湿.*能力|dehumidif/i
  const tankLabels = /容量|tank.*volume|volume.*tank|タンク/i

  const findInSpec = (value: string): string | null => {
    const direct = extractCapacity(value)
    if (direct) return direct
    // "10 1日あたりのリットル数" → 10L, "4.5 Liters" → 4.5L, "18 L/day"
    const m = value.match(/(\d+\.?\d*)\s*(?:1日あたり|リットル|liter|litre|L\/day|L\/日)/i)
    if (m) return `${parseFloat(m[1]!)}L`
    return null
  }

  // Check dehumidification capacity first
  for (const spec of specs) {
    if (dehumidLabels.test(spec.label)) {
      const found = findInSpec(spec.value)
      if (found) return found
    }
  }
  // Fallback: tank volume
  for (const spec of specs) {
    if (tankLabels.test(spec.label)) {
      const found = findInSpec(spec.value)
      if (found) return found
    }
  }
  return null
}

async function translateNameViaGoogleFree(
  productName: string,
  specs: { label: string; value: string }[] = [],
): Promise<string> {
  if (!productName) return productName

  const normalized = normalizeJapanese(productName)
  const model = extractModel(normalized) ?? extractModel(productName)
  const brand = extractBrand(productName, normalized)
  const type = extractProductType(productName) ?? extractProductType(normalized)
  const capacity =
    extractCapacity(productName) ??
    extractCapacity(normalized) ??
    extractCapacityFromSpecs(specs)

  // Build structured name: Loại sản phẩm + Hãng + Model + Dung tích
  const parts: string[] = []
  if (type) parts.push(type)
  if (brand) parts.push(brand)
  if (model) parts.push(model)
  if (capacity) parts.push(capacity)

  if (parts.length > 0) return parts.join(' ')

  // Fallback: clean normalized text if no structured parts found
  const cleaned = normalized
    .replace(/[ぁ-んァ-ヶ一-鿿々〆〇！-～]/g, ' ')
    .replace(/【[^】]*】/g, '')
    .replace(/（[^）]*）/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return postProcess(cleaned)
}

async function getTranslationConfig(): Promise<{ provider: Provider; apiKey: string | null }> {
  try {
    const setting = await prisma.bfjSetting.findUnique({ where: { id: 'default' } })
    return {
      provider: (setting?.translationProvider ?? 'google-free') as Provider,
      apiKey: decryptIfNeeded(setting?.translationApiKey) ?? null,
    }
  } catch {
    return { provider: 'google-free', apiKey: null }
  }
}

async function translateViaAnthropic(text: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Bạn là chuyên gia dịch tên sản phẩm gia dụng Nhật Bản sang tiếng Việt.

Quy tắc BẮT BUỘC:
- Giữ nguyên tên thương hiệu (Panasonic, Hitachi, Toshiba, Sharp, v.v.)
- Giữ nguyên mã model/số sản phẩm (ví dụ: NA-VX9900L, EH-NA9J)
- Giữ nguyên thông số kỹ thuật và đơn vị (6.0kg, 500W, 2.5L)
- Dịch loại sản phẩm sang tiếng Việt tự nhiên
- Kết quả ngắn gọn: [Loại sản phẩm] [Thương hiệu] [Model] [Thông số chính]
- Chỉ trả lời tên đã dịch, không giải thích

Ví dụ:
Input: "Panasonic NA-VX9900L Drum Washing Machine 10kg"
Output: Máy giặt lồng ngang Panasonic NA-VX9900L 10kg

Input: "Hitachi R-HW60R refrigerator 6-door 505L"
Output: Tủ lạnh 6 cánh Hitachi R-HW60R 505L

Input: "Sharp Plasmacluster Air Purifier KC-G50"
Output: Máy lọc không khí Plasmacluster Sharp KC-G50

Tên sản phẩm cần dịch:
${text}`,
      }],
    }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}`)
  const data = await res.json()
  return data?.content?.[0]?.text?.trim() || text
}

async function translateViaGoogle(text: string, apiKey: string): Promise<string> {
  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ q: text, source: 'en', target: 'vi', format: 'text' }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Google Translate ${res.status}`)
  const data = await res.json()
  const raw: string = data?.data?.translations?.[0]?.translatedText ?? ''
  return postProcess(restoreProtectedTokens(raw, extractProtectedTokens(text).tokens))
}

export async function translateProductName(
  productName: string,
  specs: { label: string; value: string }[] = [],
): Promise<string> {
  if (!productName) return productName
  // Always use structured JP extraction — independent of admin translation provider setting
  return translateNameViaGoogleFree(productName, specs)
}

/**
 * Dịch nhãn + giá trị thông số JP→VI. Giữ nguyên brand/model/số (text không có chữ Nhật bỏ qua).
 */
export async function translateSpecs(
  specs: { label: string; value: string }[] = [],
): Promise<{ label: string; value: string }[]> {
  if (!specs?.length) return specs
  const hasJp = (s: string) => /[぀-ヿ㐀-鿿]/.test(s)
  // Sửa lỗi vặt bản dịch free: token bảo vệ "§§N§§" bị chèn space làm hỏng; "の"→"củ A"→"của"
  const clean = (t: string) => t
    .replace(/§\s*§\s*\d+\s*§\s*§/g, '')
    .replace(/\bcủ A\b/g, 'của')
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  const tr = async (t: string): Promise<string> => {
    if (!t || !hasJp(t)) return t
    try { return clean(await translateViaGoogleFree(t)) } catch { return t }
  }
  return Promise.all(
    specs.slice(0, 25).map(async (s) => ({ label: await tr(s.label), value: await tr(s.value) })),
  )
}

/**
 * Translate a block of HTML description — preserves HTML tags, only translates text nodes
 */
export async function translateDescription(html: string): Promise<string> {
  if (!html) return html

  try {
    const { provider, apiKey } = await getTranslationConfig()
    if (provider === 'none') return html

    // Strip tags for translation, re-inject after
    const textOnly = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    if (!textOnly) return html

    let translated: string
    if (provider === 'anthropic' && apiKey) {
      translated = await translateViaAnthropic(textOnly, apiKey)
    } else if (provider === 'google' && apiKey) {
      const { cleaned, tokens } = extractProtectedTokens(textOnly)
      translated = postProcess(restoreProtectedTokens(await translateViaGoogle(cleaned, apiKey), tokens))
    } else {
      translated = await translateViaGoogleFree(textOnly)
    }

    // Return translated text wrapped in a paragraph (original HTML structure is complex)
    return `<p>${translated}</p>`
  } catch {
    return html
  }
}

/**
 * Translate specification labels/values — translates each row individually
 */
export async function translateSpecifications(
  specs: { label: string; value: string }[]
): Promise<{ label: string; value: string }[]> {
  if (!specs.length) return specs

  try {
    const { provider } = await getTranslationConfig()
    if (provider === 'none') return specs

    return await Promise.all(
      specs.map(async (spec) => {
        try {
          const [translatedLabel, translatedValue] = await Promise.all([
            translateProductName(spec.label),
            // Only translate value if it contains non-numeric/non-unit text
            /[a-zA-Zぁ-ん一-龥]/.test(spec.value)
              ? translateProductName(spec.value)
              : Promise.resolve(spec.value),
          ])
          return { label: translatedLabel, value: translatedValue }
        } catch {
          return spec
        }
      })
    )
  } catch {
    return specs
  }
}
