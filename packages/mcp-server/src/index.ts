#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import Anthropic from '@anthropic-ai/sdk'
import { createDecipheriv, scryptSync } from 'crypto'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { readFileSync } from 'fs'
import path from 'path'

// ── Decrypt (same algo as web app) ────────────────────────────────────────────
function decrypt(ciphertext: string): string {
  const secret = process.env.ENCRYPTION_KEY
  if (!secret) throw new Error('ENCRYPTION_KEY not set')
  const key = scryptSync(secret, 'japanvip-v2-salt', 32)
  const [ivHex, tagHex, dataHex] = ciphertext.split(':')
  if (!ivHex || !tagHex || !dataHex) throw new Error('Invalid ciphertext')
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return decipher.update(Buffer.from(dataHex, 'hex')) + decipher.final('utf8')
}

async function getAiKey(): Promise<string | null> {
  const row = await prisma.siteSetting.findUnique({ where: { key: 'ai.anthropic_api_key' } })
  if (!row) return process.env.ANTHROPIC_API_KEY ?? null
  try { return decrypt(row.value) } catch { return null }
}

function getR2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    },
  })
}

// ── Server ────────────────────────────────────────────────────────────────────
const server = new McpServer({ name: 'japanvip-mcp', version: '1.0.0' })

// ── search_products ───────────────────────────────────────────────────────────
server.tool(
  'search_products',
  'Tìm kiếm sản phẩm theo tên, danh mục, thương hiệu. Trả về danh sách với id, name, slug, status, brand, category.',
  {
    query: z.string().optional().describe('Từ khóa tìm kiếm tên sản phẩm'),
    category: z.string().optional().describe('Slug danh mục'),
    brand: z.string().optional().describe('Slug thương hiệu'),
    limit: z.number().min(1).max(50).default(20),
  },
  async ({ query, category, brand, limit }) => {
    const products = await prisma.product.findMany({
      where: {
        ...(query ? { name: { contains: query, mode: 'insensitive' } } : {}),
        ...(category ? { category: { slug: category } } : {}),
        ...(brand ? { brand: { slug: brand } } : {}),
      },
      select: {
        id: true, name: true, slug: true, status: true, salePrice: true, marketPrice: true,
        brand: { select: { name: true, slug: true } },
        category: { select: { name: true, slug: true } },
        _count: { select: { attributes: true, images: true } },
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    })
    return { content: [{ type: 'text' as const, text: JSON.stringify({ count: products.length, products }, null, 2) }] }
  }
)

// ── get_product ───────────────────────────────────────────────────────────────
server.tool(
  'get_product',
  'Lấy toàn bộ thông tin một sản phẩm: mô tả, thông số, SEO, ảnh, attributes.',
  { id: z.string().describe('Product ID hoặc slug') },
  async ({ id }) => {
    const product = await prisma.product.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        brand: true,
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        attributes: true,
      },
    })
    if (!product) return { content: [{ type: 'text' as const, text: 'Không tìm thấy sản phẩm.' }] }
    return { content: [{ type: 'text' as const, text: JSON.stringify(product, null, 2) }] }
  }
)

// ── update_product_description ────────────────────────────────────────────────
server.tool(
  'update_product_description',
  'Cập nhật mô tả HTML của sản phẩm.',
  {
    id: z.string().describe('Product ID'),
    description: z.string().describe('Nội dung HTML mô tả sản phẩm'),
  },
  async ({ id, description }) => {
    await prisma.product.update({ where: { id }, data: { description } })
    return { content: [{ type: 'text' as const, text: `✓ Đã cập nhật mô tả sản phẩm ${id}` }] }
  }
)

// ── update_product_seo ────────────────────────────────────────────────────────
server.tool(
  'update_product_seo',
  'Cập nhật SEO title và meta description của sản phẩm.',
  {
    id: z.string().describe('Product ID'),
    metaTitle: z.string().optional(),
    metaDesc: z.string().optional(),
    slug: z.string().optional().describe('Slug URL mới — cẩn thận, ảnh hưởng đến link hiện có'),
  },
  async ({ id, metaTitle, metaDesc, slug }) => {
    const data: Record<string, string> = {}
    if (metaTitle) data.metaTitle = metaTitle
    if (metaDesc) data.metaDesc = metaDesc
    if (slug) data.slug = slug
    await prisma.product.update({ where: { id }, data })
    return { content: [{ type: 'text' as const, text: `✓ Đã cập nhật SEO cho sản phẩm ${id}` }] }
  }
)

// ── upsert_product_attributes ─────────────────────────────────────────────────
server.tool(
  'upsert_product_attributes',
  'Thêm hoặc cập nhật attributes cho sản phẩm. Prefix chuẩn: [quick], [faq], [promo], [warranty], [group:X].',
  {
    productId: z.string(),
    attributes: z.array(z.object({
      name: z.string().describe('Ví dụ: [quick]Bảo hành hoặc [faq]Câu hỏi?'),
      value: z.string(),
      order: z.number().optional().describe('Thứ tự hiển thị (0 = đầu tiên)'),
    })),
    replacePrefix: z.string().optional().describe('Xoá toàn bộ attribute có prefix này trước khi thêm mới. Ví dụ: [faq]'),
  },
  async ({ productId, attributes, replacePrefix }) => {
    if (replacePrefix) {
      await prisma.productAttribute.deleteMany({
        where: { productId, name: { startsWith: replacePrefix } },
      })
    }
    for (let i = 0; i < attributes.length; i++) {
      const attr = attributes[i]
      const sortOrder = attr.order ?? i
      const existing = await prisma.productAttribute.findFirst({
        where: { productId, name: attr.name },
      })
      if (existing) {
        await prisma.productAttribute.update({ where: { id: existing.id }, data: { value: attr.value, sortOrder } })
      } else {
        await prisma.productAttribute.create({ data: { productId, name: attr.name, value: attr.value, sortOrder } })
      }
    }
    return { content: [{ type: 'text' as const, text: `✓ Đã upsert ${attributes.length} attributes cho sản phẩm ${productId}` }] }
  }
)

// ── list_categories ───────────────────────────────────────────────────────────
server.tool(
  'list_categories',
  'Lấy danh sách tất cả danh mục sản phẩm.',
  {},
  async () => {
    const cats = await prisma.category.findMany({
      select: { id: true, name: true, slug: true, _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    })
    return { content: [{ type: 'text' as const, text: JSON.stringify(cats, null, 2) }] }
  }
)

// ── list_brands ───────────────────────────────────────────────────────────────
server.tool(
  'list_brands',
  'Lấy danh sách tất cả thương hiệu.',
  {},
  async () => {
    const brands = await prisma.brand.findMany({
      select: { id: true, name: true, slug: true, _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    })
    return { content: [{ type: 'text' as const, text: JSON.stringify(brands, null, 2) }] }
  }
)

// ── get_site_setting ──────────────────────────────────────────────────────────
server.tool(
  'get_site_setting',
  'Đọc giá trị một cài đặt hệ thống theo key.',
  { key: z.string() },
  async ({ key }) => {
    const row = await prisma.siteSetting.findUnique({ where: { key } })
    return { content: [{ type: 'text' as const, text: row?.value ?? '(chưa cài đặt)' }] }
  }
)

// ── set_site_setting ──────────────────────────────────────────────────────────
server.tool(
  'set_site_setting',
  'Ghi giá trị một cài đặt hệ thống theo key.',
  { key: z.string(), value: z.string() },
  async ({ key, value }) => {
    await prisma.siteSetting.upsert({
      where: { key }, update: { value }, create: { key, value },
    })
    return { content: [{ type: 'text' as const, text: `✓ Đã lưu ${key}` }] }
  }
)

// ── generate_ai_content ───────────────────────────────────────────────────────
server.tool(
  'generate_ai_content',
  'Dùng Claude AI tạo nội dung cho sản phẩm: description, faq, seo, attributes, blog.',
  {
    type: z.enum(['description', 'faq', 'seo', 'attributes', 'blog']),
    productName: z.string(),
    specs: z.string().optional(),
    keywords: z.string().optional(),
    extra: z.string().optional(),
    instruction: z.string().optional().describe('Hướng dẫn bổ sung cho AI'),
  },
  async ({ type, productName, specs, keywords, extra, instruction }) => {
    const apiKey = await getAiKey()
    if (!apiKey) return { content: [{ type: 'text' as const, text: '❌ Chưa cài Anthropic API Key. Vào Admin → Cài đặt → AI Keys.' }] }

    const client = new Anthropic({ apiKey })
    const base = [
      `Sản phẩm: ${productName}`,
      specs ? `Thông số:\n${specs}` : '',
      keywords ? `Từ khóa SEO: ${keywords}` : '',
      extra ? `Thông tin thêm: ${extra}` : '',
    ].filter(Boolean).join('\n')
    const note = instruction ? `\n\n📌 Yêu cầu bổ sung:\n${instruction}` : ''

    const prompts: Record<string, string> = {
      description: `${base}\nViết MÔ TẢ SẢN PHẨM dạng HTML đầy đủ. Tối thiểu 8 section h2, dùng compare-grid cho số liệu, kết thúc bằng cam kết Japan VIP.${note}`,
      faq: `${base}\nTạo 8 câu HỎI & ĐÁP thực tế. JSON: [{"name":"Câu hỏi?","value":"Trả lời..."}]${note}`,
      attributes: `${base}\nTạo ATTRIBUTES JSON: {quick:[{name,value}], promo:[{name,value}], warranty:[{name,value}], specs:[{group,name,value}]}${note}`,
      seo: `${base}\nTạo JSON: {"title":"...","description":"...","keywords":[...],"slug":"..."}${note}`,
      blog: `${base}\nViết BÀI VIẾT BLOG dạng HTML 1200+ từ, SEO-friendly, kết thúc CTA Japan VIP.${note}`,
    }

    const msg = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 8192,
      system: 'Bạn là chuyên gia viết content sản phẩm cho Japan VIP — thương hiệu phân phối hàng gia dụng nội địa Nhật Bản tại Việt Nam. Viết tiếng Việt chuyên nghiệp, có số liệu cụ thể.',
      messages: [{ role: 'user', content: prompts[type]! }],
    })

    const text = msg.content[0]?.type === 'text' ? msg.content[0].text : ''
    return { content: [{ type: 'text' as const, text }] }
  }
)

// ── upload_image_to_r2 ────────────────────────────────────────────────────────
server.tool(
  'upload_image_to_r2',
  'Upload ảnh từ đường dẫn file local lên Cloudflare R2. Trả về URL public.',
  {
    filePath: z.string().describe('Đường dẫn tuyệt đối đến file ảnh trên máy'),
    folder: z.string().default('products').describe('Thư mục: products, blog, banners...'),
    fileName: z.string().optional(),
  },
  async ({ filePath, folder, fileName }) => {
    const r2 = getR2Client()
    const buffer = readFileSync(filePath)
    const ext = path.extname(filePath).toLowerCase()
    const name = fileName ?? path.basename(filePath)
    const key = `${folder}/${Date.now()}-${name}`
    const contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'

    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME ?? 'japanvip-media',
      Key: key, Body: buffer, ContentType: contentType,
    }))

    const url = `${process.env.R2_PUBLIC_URL ?? 'https://media.japanvip.vn'}/${key}`
    return { content: [{ type: 'text' as const, text: `✓ Upload thành công:\n${url}` }] }
  }
)

// ── add_product_image ─────────────────────────────────────────────────────────
server.tool(
  'add_product_image',
  'Thêm URL ảnh vào gallery sản phẩm trong database.',
  {
    productId: z.string(),
    url: z.string(),
    altText: z.string().optional(),
    isPrimary: z.boolean().default(false),
  },
  async ({ productId, url, altText, isPrimary }) => {
    const count = await prisma.productImage.count({ where: { productId } })
    if (isPrimary) {
      await prisma.productImage.updateMany({ where: { productId }, data: { isPrimary: false } })
    }
    await prisma.productImage.create({
      data: { productId, url, altText: altText ?? '', isPrimary: isPrimary || count === 0, sortOrder: count },
    })
    return { content: [{ type: 'text' as const, text: `✓ Đã thêm ảnh vào sản phẩm ${productId}` }] }
  }
)

// ── get_dashboard_stats ───────────────────────────────────────────────────────
server.tool(
  'get_dashboard_stats',
  'Thống kê tổng quan: số sản phẩm, sản phẩm thiếu mô tả, thiếu ảnh, số danh mục, thương hiệu.',
  {},
  async () => {
    const [total, published, noDescription, noImages, totalCategories, totalBrands] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.product.count({ where: { OR: [{ description: null }, { description: '' }] } }),
      prisma.product.count({ where: { images: { none: {} } } }),
      prisma.category.count(),
      prisma.brand.count(),
    ])
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ products: { total, published, noDescription, noImages }, categories: totalCategories, brands: totalBrands }, null, 2),
      }],
    }
  }
)

// ── Start ─────────────────────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('🚀 Japan VIP MCP Server đang chạy...')
}

main().catch(err => { console.error('MCP error:', err); process.exit(1) })
