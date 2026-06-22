export type ParsedProduct = {
  platform: 'AMAZON_JP' | 'RAKUTEN' | 'MERCARI' | 'YAHOO_SHOPPING' | 'OTHER'
  sourceUrl: string
  productName: string | null
  productNameVi: string | null    // Translated Vietnamese name
  productModel: string | null     // ASIN / model number
  productImage: string | null
  images: string[]
  unitPriceJpy: number | null
  priceOptionsJpy?: number[]      // Nhiều biến thể (khác màu) → danh sách giá tham khảo (khoảng giá)
  colorVariants?: { name: string; image: string }[]  // Biến thể màu: ảnh + tên (khách biết có màu gì)
  weightKg: number | null         // Product weight in kg for shipping tier
  variations: string[]
  available: boolean
  description: string
  specifications: { label: string; value: string }[]
  rawHtml?: string
}

export type ParseError = {
  url: string
  platform: string
  message: string
}
