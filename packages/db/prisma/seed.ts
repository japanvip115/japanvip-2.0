import { PrismaClient, ProductStatus, ProductOwnerType } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Japan VIP database...')

  // ─── 1. ADMIN USER ───────────────────────────────────────────
  const adminPassword = await hash('Admin@123456', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@japanvip.vn' },
    update: {},
    create: {
      email: 'admin@japanvip.vn',
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      passwordHash: adminPassword,
      profile: {
        create: {
          fullName: 'Nguyễn Thị Giang',
        },
      },
      wallet: { create: { balance: 0 } },
    },
  })
  console.log('✓ Admin user:', admin.email)

  // ─── 2. SITE SETTINGS ────────────────────────────────────────
  const siteSettings = [
    { key: 'site_name', value: 'Japan VIP' },
    { key: 'site_tagline', value: 'Phân phối hàng nội địa Nhật Bản mới 100%' },
    { key: 'site_logo_url', value: '/images/logo.png' },
    { key: 'site_favicon_url', value: '/favicon.ico' },
    { key: 'site_phone', value: '09.2729.8888' },
    { key: 'site_email', value: 'info@japanvip.vn' },
    { key: 'site_address', value: '115 Đinh Tiên Hoàng, Hồng Bàng, Hải Phòng' },
    { key: 'site_address_2', value: '21 Lê Văn Lương, Thanh Xuân, Hà Nội' },
    { key: 'site_facebook', value: 'https://facebook.com/japanvip' },
    { key: 'site_youtube', value: 'https://youtube.com/c/JapanvipVn1' },
    { key: 'site_zalo', value: 'https://zalo.me/0988969896' },
    { key: 'site_working_hours', value: '08:00 – 18:30 (tất cả các ngày)' },
    { key: 'site_business_code', value: '0110917536' },
    { key: 'font_heading', value: 'Be Vietnam Pro' },
    { key: 'font_body', value: 'Be Vietnam Pro' },
  ]
  for (const s of siteSettings) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    })
  }
  console.log('✓ Site settings:', siteSettings.length, 'entries')

  // ─── 3. EXCHANGE RATE ─────────────────────────────────────────
  const existing = await prisma.exchangeRate.findFirst({ where: { fromCurrency: 'JPY', toCurrency: 'VND' } })
  if (!existing) {
    await prisma.exchangeRate.create({
      data: { fromCurrency: 'JPY', toCurrency: 'VND', rate: 172, source: 'manual' },
    })
  }
  console.log('✓ Exchange rate: 1 JPY = 172 VND')

  // ─── 4. BFJ SETTINGS ─────────────────────────────────────────
  await prisma.bfjSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      serviceFeeRate: 0.08,
      domesticShippingJpy: 0,
      surchargeRate: 0,
      depositRate: 0.30,
      translationProvider: 'none',
    },
  })

  const shippingTiers = [
    { label: 'Dưới 0.5kg', maxWeightKg: 0.5, priceVnd: 280000, actualCostVnd: 220000 },
    { label: '0.5 – 1kg',  maxWeightKg: 1,   priceVnd: 350000, actualCostVnd: 280000 },
    { label: '1 – 2kg',    maxWeightKg: 2,   priceVnd: 450000, actualCostVnd: 360000 },
    { label: '2 – 5kg',    maxWeightKg: 5,   priceVnd: 600000, actualCostVnd: 480000 },
    { label: '5 – 10kg',   maxWeightKg: 10,  priceVnd: 900000, actualCostVnd: 720000 },
    { label: 'Trên 10kg',  maxWeightKg: null, priceVnd: 1200000, actualCostVnd: 960000 },
  ]
  for (const tier of shippingTiers) {
    await prisma.bfjShippingTier.create({ data: tier }).catch(() => {})
  }
  console.log('✓ BFJ settings + shipping tiers')

  // ─── 5. CATEGORIES ───────────────────────────────────────────
  const categories = [
    { name: 'Thiết bị nhà bếp', slug: 'thiet-bi-nha-bep', icon: '🍳', sortOrder: 1 },
    { name: 'Đồ gia dụng',      slug: 'do-gia-dung',      icon: '🏠', sortOrder: 2 },
    { name: 'Điều hòa & Độ ẩm', slug: 'dieu-hoa-do-am',   icon: '❄️',  sortOrder: 3 },
    { name: 'Thiết bị vệ sinh',  slug: 'thiet-bi-ve-sinh', icon: '🚿', sortOrder: 4 },
    { name: 'Điện lạnh',         slug: 'dien-lanh',         icon: '🧊', sortOrder: 5 },
    { name: 'Công nghệ',         slug: 'cong-nghe',         icon: '💻', sortOrder: 6 },
    { name: 'Chăm sóc cá nhân',  slug: 'cham-soc-ca-nhan', icon: '💆', sortOrder: 7 },
  ]
  const categoryMap: Record<string, string> = {}
  for (const cat of categories) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { ...cat, metaTitle: cat.name + ' | Japan VIP' },
    })
    categoryMap[cat.slug] = created.id
  }

  // Sub-categories
  const subCategories = [
    { name: 'Bếp từ', slug: 'bep-tu', parentSlug: 'thiet-bi-nha-bep', sortOrder: 1 },
    { name: 'Lò vi sóng', slug: 'lo-vi-song', parentSlug: 'thiet-bi-nha-bep', sortOrder: 2 },
    { name: 'Máy rửa bát', slug: 'may-rua-bat', parentSlug: 'thiet-bi-nha-bep', sortOrder: 3 },
    { name: 'Máy lọc nước', slug: 'may-loc-nuoc', parentSlug: 'thiet-bi-nha-bep', sortOrder: 4 },
    { name: 'Máy hút bụi', slug: 'may-hut-bui', parentSlug: 'do-gia-dung', sortOrder: 1 },
    { name: 'Nồi cơm điện', slug: 'noi-com-dien', parentSlug: 'do-gia-dung', sortOrder: 2 },
    { name: 'Nồi chiên không dầu', slug: 'noi-chien-khong-dau', parentSlug: 'do-gia-dung', sortOrder: 3 },
    { name: 'Quạt điện', slug: 'quat-dien', parentSlug: 'do-gia-dung', sortOrder: 4 },
    { name: 'Máy giặt', slug: 'may-giat', parentSlug: 'dien-lanh', sortOrder: 1 },
    { name: 'Tủ lạnh', slug: 'tu-lanh', parentSlug: 'dien-lanh', sortOrder: 2 },
    { name: 'Điều hòa', slug: 'dieu-hoa', parentSlug: 'dieu-hoa-do-am', sortOrder: 1 },
    { name: 'Máy lọc không khí', slug: 'may-loc-khong-khi', parentSlug: 'dieu-hoa-do-am', sortOrder: 2 },
    { name: 'Máy sấy tóc', slug: 'may-say-toc', parentSlug: 'cham-soc-ca-nhan', sortOrder: 1 },
    { name: 'Ghế massage', slug: 'ghe-massage', parentSlug: 'cham-soc-ca-nhan', sortOrder: 2 },
  ]
  for (const sub of subCategories) {
    const created = await prisma.category.upsert({
      where: { slug: sub.slug },
      update: {},
      create: {
        name: sub.name,
        slug: sub.slug,
        parentId: categoryMap[sub.parentSlug],
        sortOrder: sub.sortOrder,
        metaTitle: sub.name + ' Nhật Bản | Japan VIP',
      },
    })
    categoryMap[sub.slug] = created.id
  }
  console.log('✓ Categories:', Object.keys(categoryMap).length, 'total')

  // ─── 6. BRANDS ───────────────────────────────────────────────
  const brands = [
    { name: 'Panasonic', slug: 'panasonic', country: 'Japan' },
    { name: 'Sharp',     slug: 'sharp',     country: 'Japan' },
    { name: 'Toshiba',   slug: 'toshiba',   country: 'Japan' },
    { name: 'Hitachi',   slug: 'hitachi',   country: 'Japan' },
    { name: 'Mitsubishi', slug: 'mitsubishi', country: 'Japan' },
    { name: 'Daikin',    slug: 'daikin',    country: 'Japan' },
    { name: 'Zojirushi', slug: 'zojirushi', country: 'Japan' },
    { name: 'Tiger',     slug: 'tiger',     country: 'Japan' },
    { name: 'Dyson',     slug: 'dyson',     country: 'Japan' },
    { name: 'Iris Ohyama', slug: 'iris-ohyama', country: 'Japan' },
    { name: 'Balmuda',   slug: 'balmuda',   country: 'Japan' },
    { name: 'Coway',     slug: 'coway',     country: 'Japan' },
  ]
  const brandMap: Record<string, string> = {}
  for (const brand of brands) {
    const created = await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: {},
      create: brand,
    })
    brandMap[brand.slug] = created.id
  }
  console.log('✓ Brands:', brands.length)

  // ─── 7. PRODUCTS ─────────────────────────────────────────────
  const products = [
    {
      name: 'Nồi cơm điện cao tần Zojirushi NW-JEC18 1.8L',
      slug: 'noi-com-dien-cao-tan-zojirushi-nw-jec18-1-8l',
      categorySlug: 'noi-com-dien',
      brandSlug: 'zojirushi',
      salePrice: 4500000,
      marketPrice: 5200000,
      originPrice: 26500,
      badge: 'Bán chạy',
      description: 'Nồi cơm điện cao tần IH Zojirushi NW-JEC18, dung tích 1.8L, nấu cơm ngon tuyệt vời với công nghệ áp suất cao.',
      attributes: [
        { name: 'Dung tích', value: '1.8L' },
        { name: 'Công suất', value: '1300W' },
        { name: 'Màu sắc', value: 'Trắng bạc' },
        { name: 'Xuất xứ', value: 'Nhật Bản' },
      ],
    },
    {
      name: 'Máy hút bụi không dây Dyson V12 Detect Slim',
      slug: 'may-hut-bui-khong-day-dyson-v12-detect-slim',
      categorySlug: 'may-hut-bui',
      brandSlug: 'dyson',
      salePrice: 12900000,
      marketPrice: 15500000,
      originPrice: 74800,
      badge: 'Mới',
      description: 'Máy hút bụi không dây Dyson V12 với công nghệ laser phát hiện bụi siêu nhỏ, lực hút mạnh 150AW.',
      attributes: [
        { name: 'Loại', value: 'Không dây' },
        { name: 'Thời gian sạc', value: '4.5 giờ' },
        { name: 'Thời lượng pin', value: '60 phút' },
        { name: 'Bộ lọc', value: 'HEPA' },
      ],
    },
    {
      name: 'Bếp từ đôi Panasonic KY-C227D',
      slug: 'bep-tu-doi-panasonic-ky-c227d',
      categorySlug: 'bep-tu',
      brandSlug: 'panasonic',
      salePrice: 3800000,
      marketPrice: 4500000,
      originPrice: 22000,
      badge: 'Hot',
      description: 'Bếp từ đôi Panasonic KY-C227D với 2 vùng nấu độc lập, công suất 3200W, màn hình cảm ứng hiện đại.',
      attributes: [
        { name: 'Số vùng nấu', value: '2' },
        { name: 'Công suất', value: '3200W' },
        { name: 'Kích thước', value: '59 x 31.5 cm' },
      ],
    },
    {
      name: 'Máy lọc không khí Sharp FP-J80E-W',
      slug: 'may-loc-khong-khi-sharp-fp-j80e-w',
      categorySlug: 'may-loc-khong-khi',
      brandSlug: 'sharp',
      salePrice: 5200000,
      marketPrice: 6800000,
      originPrice: 30000,
      badge: 'Chính hãng',
      description: 'Máy lọc không khí Sharp với công nghệ Plasmacluster Ion 25000, diện tích lọc 40m², lọc bụi PM2.5 hiệu quả.',
      attributes: [
        { name: 'Diện tích', value: '40m²' },
        { name: 'CADR', value: '360 m³/h' },
        { name: 'Mức ồn', value: '18 dB' },
        { name: 'Bộ lọc', value: 'HEPA + Carbon' },
      ],
    },
    {
      name: 'Nồi chiên không dầu Iris Ohyama IAF-130C',
      slug: 'noi-chien-khong-dau-iris-ohyama-iaf-130c',
      categorySlug: 'noi-chien-khong-dau',
      brandSlug: 'iris-ohyama',
      salePrice: 1850000,
      marketPrice: 2200000,
      originPrice: 10800,
      badge: 'Tiết kiệm',
      description: 'Nồi chiên không dầu Iris Ohyama 3L, nhiệt độ 80-200°C, timer 30 phút, không cần dầu ăn.',
      attributes: [
        { name: 'Dung tích', value: '3L' },
        { name: 'Công suất', value: '1200W' },
        { name: 'Nhiệt độ', value: '80–200°C' },
      ],
    },
    {
      name: 'Máy sấy tóc Panasonic EH-NA98 2400W',
      slug: 'may-say-toc-panasonic-eh-na98-2400w',
      categorySlug: 'may-say-toc',
      brandSlug: 'panasonic',
      salePrice: 3200000,
      marketPrice: 3900000,
      originPrice: 18500,
      badge: 'Phổ biến',
      description: 'Máy sấy tóc Panasonic EH-NA98 với công nghệ Nano-e ion âm, bảo vệ tóc khỏi hư tổn, sấy nhanh 2400W.',
      attributes: [
        { name: 'Công suất', value: '2400W' },
        { name: 'Tốc độ gió', value: '2 mức' },
        { name: 'Nhiệt độ', value: '3 mức' },
        { name: 'Ion âm', value: 'Nano-e' },
      ],
    },
  ]

  for (const p of products) {
    const { attributes, categorySlug, brandSlug, ...data } = p
    const product = await prisma.product.upsert({
      where: { slug: data.slug },
      update: {},
      create: {
        ...data,
        categoryId: categoryMap[categorySlug],
        brandId: brandMap[brandSlug],
        ownerType: 'JAPANVIP' as ProductOwnerType,
        status: 'ACTIVE' as ProductStatus,
        condition: 'NEW',
        rating: 4.8,
        reviewCount: Math.floor(Math.random() * 50) + 10,
        metaTitle: data.name + ' | Japan VIP',
        metaDesc: data.description?.slice(0, 160),
        attributes: {
          create: attributes.map((a) => ({ ...a })),
        },
      },
    })
    console.log('  + Product:', product.name.slice(0, 50))
  }
  console.log('✓ Products:', products.length)

  // ─── 8. BANNERS ──────────────────────────────────────────────
  const banners = [
    {
      title: 'Hàng nội địa Nhật Bản chính hãng',
      imageUrl: '/images/banners/banner-1.jpg',
      linkUrl: '/san-pham',
      position: 'hero',
      sortOrder: 1,
      isActive: true,
    },
    {
      title: 'Mua hàng Nhật trực tiếp từ Nhật Bản',
      imageUrl: '/images/banners/banner-2.jpg',
      linkUrl: '/mua-ho',
      position: 'hero',
      sortOrder: 2,
      isActive: true,
    },
    {
      title: 'Đấu giá hàng Nhật giá tốt',
      imageUrl: '/images/banners/banner-3.jpg',
      linkUrl: '/dau-gia',
      position: 'hero',
      sortOrder: 3,
      isActive: true,
    },
  ]
  for (const banner of banners) {
    await prisma.banner.create({ data: banner }).catch(() => {})
  }
  console.log('✓ Banners:', banners.length)

  // ─── 9. BLOG CATEGORY ────────────────────────────────────────
  await prisma.blogCategory.upsert({
    where: { slug: 'tin-tuc' },
    update: {},
    create: { name: 'Tin tức', slug: 'tin-tuc' },
  })
  await prisma.blogCategory.upsert({
    where: { slug: 'huong-dan' },
    update: {},
    create: { name: 'Hướng dẫn mua hàng', slug: 'huong-dan' },
  })
  await prisma.blogCategory.upsert({
    where: { slug: 'review' },
    update: {},
    create: { name: 'Đánh giá sản phẩm', slug: 'review' },
  })
  console.log('✓ Blog categories: 3')

  console.log('\n✅ Seed completed successfully!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Admin login: admin@japanvip.vn / Admin@123456')
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
