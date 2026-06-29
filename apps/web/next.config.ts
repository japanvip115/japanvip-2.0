import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '10mb' },
  },
  // ESLint: không chặn build/deploy nếu có lỗi lint (CI chạy lint riêng dạng cảnh báo)
  eslint: { ignoreDuringBuilds: true },
  // Domain chính = japanvip.vn. store/www → 301 redirect về apex (gộp SEO, không trùng nội dung).
  async redirects() {
    // ─── Old site (.html) → New site (301 permanent) ──────────────────────────
    // Nguồn: japanvipnet_db.sql (host cũ) — Google vẫn index các link này
    const oldSiteRedirects = [
      // == CATEGORIES (danh mục cũ → /danh-muc/slug) ==
      { source: '/bep-tu.html',                 destination: '/danh-muc/bep-tu' },
      { source: '/may-say-bat.html-1',           destination: '/danh-muc/may-say-bat' },
      { source: '/do-dung-gia-dinh.html',        destination: '/danh-muc/do-dung-gia-dinh' },
      { source: '/noi-com-dien.html',            destination: '/danh-muc/noi-com-dien' },
      { source: '/noi-u.html',                   destination: '/danh-muc/noi-com-dien' },
      { source: '/lo-vi-song.html',              destination: '/danh-muc/lo-vi-song' },
      { source: '/quat-dien.html',               destination: '/danh-muc/quat-dien' },
      { source: '/may-loc-nuoc.html',            destination: '/danh-muc/may-loc-nuoc' },
      { source: '/may-rua-bat.html',             destination: '/danh-muc/may-rua-bat' },
      { source: '/dieu-hoa.html',                destination: '/danh-muc/dieu-hoa' },
      { source: '/dieu-hoa.html-1',              destination: '/danh-muc/dieu-hoa' },
      { source: '/tu-lanh.html',                 destination: '/danh-muc/tu-lanh' },
      { source: '/sen-voi.html',                 destination: '/danh-muc/sen-voi' },
      { source: '/sen-cay.html',                 destination: '/danh-muc/sen-voi' },
      { source: '/hut-mui-bep.html',             destination: '/danh-muc/hut-mui-bep' },
      { source: '/may-giat.html',                destination: '/danh-muc/may-giat' },
      { source: '/may-giat.html-1',              destination: '/danh-muc/may-giat' },
      { source: '/may-giat-kho.html',            destination: '/danh-muc/may-giat' },
      { source: '/may-giat-kho.html-1',          destination: '/danh-muc/may-giat' },
      { source: '/may-giat-dieu-hoa.html',       destination: '/danh-muc/may-giat' },
      { source: '/tu-cap-dong.html',             destination: '/danh-muc/tu-cap-dong' },
      { source: '/may-loc-khi.html',             destination: '/danh-muc/may-loc-khi' },
      { source: '/may-loc-khi-hut-am.html',      destination: '/danh-muc/may-loc-khi' },
      { source: '/may-hut-am.html',              destination: '/danh-muc/may-hut-am' },
      { source: '/bet-ve-sinh.html',             destination: '/danh-muc/bet-ve-sinh' },
      { source: '/thiet-bi-ve-sinh.html',        destination: '/danh-muc/bet-ve-sinh' },
      { source: '/nap-bet.html',                 destination: '/danh-muc/nap-bet' },
      { source: '/voi-chau.html',                destination: '/danh-muc/voi-chau' },
      { source: '/voi-bep.html',                 destination: '/danh-muc/voi-bep' },
      { source: '/ghe-massage.html',             destination: '/danh-muc/ghe-massage' },
      { source: '/dong-ho.html',                 destination: '/danh-muc/dong-ho' },
      { source: '/may-hut-bui.html',             destination: '/danh-muc/may-hut-bui' },
      { source: '/do-dung-khac.html',            destination: '/danh-muc/do-dung-gia-dinh' },
      { source: '/do-dung-khac.html-1',          destination: '/danh-muc/do-dung-gia-dinh' },
      // Danh mục cũ không còn trong site mới → trang sản phẩm chung
      { source: '/xu-huong-moi.html',            destination: '/san-pham' },
      { source: '/hang-gia-dung.html',           destination: '/san-pham' },
      { source: '/thiet-bi-nha-bep.html',        destination: '/san-pham' },
      { source: '/hang-dien-lanh.html',          destination: '/san-pham' },
      { source: '/binh-nong-lanh.html',          destination: '/san-pham' },
      { source: '/binh-nong-lanh.html-1',        destination: '/san-pham' },
      { source: '/do-cong-nghe.html',            destination: '/san-pham' },
      { source: '/may-say-toc.html',             destination: '/san-pham' },
      { source: '/may-suoi.html',                destination: '/san-pham' },
      { source: '/san-pham-cong-nghe.html',      destination: '/san-pham' },
      { source: '/may-pha-ca-phe.html',          destination: '/san-pham' },
      { source: '/noi-chien-khong-dau.html',     destination: '/san-pham' },
      { source: '/am-thanh-giai-tri.html',       destination: '/san-pham' },
      { source: '/phu-kien.html',                destination: '/san-pham' },

      // == PAGES (trang tĩnh cũ → trang mới) ==
      { source: '/lien-he-lam-doi-tac.html',                          destination: '/lien-he' },
      { source: '/chinh-sach-bao-tri-bao-hanh.html',                  destination: '/chinh-sach-bao-hanh' },
      { source: '/chinh-sach-bao-mat-thong-tin-khach-hang.html',      destination: '/chinh-sach-bao-mat' },
      { source: '/chinh-sach-doi-tra-hang.html',                      destination: '/chinh-sach-doi-tra' },
      { source: '/chinh-sach-van-chuyen.html',                        destination: '/chinh-sach-van-chuyen' },
      { source: '/chinh-sach-kiem-hang.html',                         destination: '/chinh-sach-doi-tra' },
      { source: '/quy-trinh-tiep-nhan-va-xu-ly-khieu-nai.html',      destination: '/chinh-sach-doi-tra' },
      { source: '/huong-dan-mua-hang-truc-tuyen.html',                destination: '/huong-dan-mua-hang' },
      { source: '/cac-hinh-thuc-mua-hang.html',                       destination: '/huong-dan-mua-hang' },
      { source: '/cac-hinh-thuc-thanh-toan.html',                     destination: '/huong-dan-mua-hang' },
      { source: '/bang-gia-lap-dat-dieu-hoa.html',                    destination: '/danh-muc/dieu-hoa' },
      { source: '/giay-phep-dkkd.html',                               destination: '/gioi-thieu' },

      // == ARTICLE CATEGORIES ==
      { source: '/tin-tuc-su-kien.html',   destination: '/blog' },
      { source: '/tu-van-tieu-dung.html',  destination: '/blog' },
      { source: '/huong-dan-su-dung.html', destination: '/blog' },

      // == ARTICLES (bài viết cũ → trang blog) ==
      // Bài viết về âm thanh/thiết bị cũ → /blog (listing)
      { source: '/kanta-no2-su-lang-man-nuoc-phap.html',                           destination: '/blog' },
      { source: '/focal-trinh-lang-2-dong-loa-lap-dat-moi-huong-den-phan-khuc-nhap-mon-va-tam-trung.html', destination: '/blog' },
      { source: '/mot-ngay-ghe-tham-tong-hanh-dinh-focal-tai-phap.html',           destination: '/blog' },
      { source: '/chord-electronics-nhung-thoi-nhom-biet-hat.html',                destination: '/blog' },
      { source: '/hieu-va-dung-dung-phu-kien-nordost-cho-dan-am-thanh.html',       destination: '/blog' },
      { source: '/amply-cong-suat-mc611-phien-ban-ke-nhiem-cua-mc601.html',        destination: '/blog' },
      { source: '/power-amplifier-am-ly-cong-suat-nhung-dieu-can-biet-phan-1.html',destination: '/blog' },
      { source: '/dan-am-thanh-nghe-nhac-15.html',      destination: '/blog' },
      { source: '/dan-am-thanh-nghe-nhac-14.html',      destination: '/blog' },
      { source: '/dan-am-thanh-nghe-nhac-13.html',      destination: '/blog' },
      { source: '/dan-am-thanh-nghe-nhac-12.html',      destination: '/blog' },
      { source: '/dan-am-thanh-nghe-nhac-11.html',      destination: '/blog' },
      { source: '/dan-am-thanh-nghe-nhac-10.html',      destination: '/blog' },
      { source: '/dan-am-thanh-nghe-nhac-09.html',      destination: '/blog' },
      { source: '/dan-am-thanh-nghe-nhac-08.html',      destination: '/blog' },
      { source: '/dan-am-thanh-nghe-nhac-07.html',      destination: '/blog' },
      { source: '/dan-am-thanh-nghe-nhac-06.html',      destination: '/blog' },
      { source: '/dan-am-thanh-nghe-nhac-05.html',      destination: '/blog' },
      { source: '/dan-am-thanh-nghe-nhac-04.html',      destination: '/blog' },
      { source: '/dan-am-thanh-nghe-nhac-02.html',      destination: '/blog' },
      { source: '/dan-am-thanh-nghe-nhac-01.html',      destination: '/blog' },
      { source: '/dan-am-thanh-xem-phim-va-nghe-nhac-17.html', destination: '/blog' },
      { source: '/dan-am-thanh-xem-phim-va-nghe-nhac-16.html', destination: '/blog' },
      { source: '/dan-am-thanh-xem-phim-va-nghe-nhac-15.html', destination: '/blog' },
      { source: '/dan-am-thanh-xem-phim-va-nghe-nhac-14.html', destination: '/blog' },
      { source: '/dan-am-thanh-xem-phim-va-nghe-nhac-13.html', destination: '/blog' },
      { source: '/dan-am-thanh-xem-phim-va-nghe-nhac-12.html', destination: '/blog' },
      { source: '/dan-am-thanh-xem-phim-va-nghe-nhac-11.html', destination: '/blog' },
      { source: '/dan-am-thanh-xem-phim-va-nghe-nhac-10.html', destination: '/blog' },
      { source: '/dan-am-thanh-xem-phim-va-nghe-nhac-09.html', destination: '/blog' },
      { source: '/dan-am-thanh-xem-phim-va-nghe-nhac-08.html', destination: '/blog' },
      { source: '/dan-am-thanh-xem-phim-va-nghe-nhac-07.html', destination: '/blog' },
      { source: '/dan-am-thanh-xem-phim-va-nghe-nhac-06.html', destination: '/blog' },
      { source: '/dan-am-thanh-xem-phim-va-nghe-nhac-05.html', destination: '/blog' },
      { source: '/dan-am-thanh-xem-phim-va-nghe-nhac-04.html', destination: '/blog' },
      { source: '/dan-am-thanh-xem-phim-va-nghe-nhac-02.html', destination: '/blog' },
      { source: '/dan-am-thanh-xem-phim-va-nghe-nhac-01.html', destination: '/blog' },
      { source: '/dan-karaoke-gia-dinh-01.html', destination: '/blog' },
      { source: '/dan-karaoke-gia-dinh-02.html', destination: '/blog' },
      { source: '/dan-karaoke-gia-dinh-03.html', destination: '/blog' },
      { source: '/dan-karaoke-gia-dinh-04.html', destination: '/blog' },
      { source: '/dan-karaoke-gia-dinh-05.html', destination: '/blog' },
      // Bài viết liên quan đến sản phẩm Japan VIP hiện tại → /blog (listing)
      { source: '/5-loi-ich-vuot-troi-cua-sen-tam-hien-thi-nhiet-do.html',                                                  destination: '/blog' },
      { source: '/ham-nong-thuc-an-bang-lo-vi-song-nhanh-chong-an-toan-va-hieu-qua.html',                                   destination: '/blog' },
      { source: '/noi-com-dien-cao-tan-tiger-jpi-a100-ko-bi-quyet-cho-bua-com-ngon-chuan-vi-nhat-ban.html',                 destination: '/blog' },
      { source: '/tai-sao-may-say-bat-panasonic-fd-s35t3-duoc-nhieu-nguoi-quan-tam.html',                                   destination: '/blog' },
      { source: '/bep-tu-nhat-ban-va-nhung-dieu-can-luu-y-khi-su-dung.html',                                               destination: '/blog' },
      { source: '/kham-pha-nhung-loi-ich-noi-bat-cua-sen-tam-co-chuc-nang-hien-thi-nhiet-do.html',                         destination: '/blog' },
      { source: '/sen-tam-cao-cap-su-lua-chon-tuyet-voi-cho-phong-tam-thuong-luu.html',                                    destination: '/blog' },
      { source: '/kinh-nghiem-khi-chon-mua-voi-sen-tam-ban-can-luu-y.html',                                                destination: '/blog' },
      { source: '/trai-nghiem-tam-mua-thu-gian-voi-sen-cay-cao-cap.html',                                                  destination: '/blog' },
      { source: '/may-giat-say-noi-dia-nhat-giai-phap-hoan-hao-cho-thoi-tiet-nom-am-mien-bac.html',                        destination: '/blog' },
      { source: '/kham-pha-5-triet-ly-van-hoa-nhat-ban-an-trong-tung-san-pham-mot-hanh-trinh-tinh-te.html',                destination: '/blog' },
      { source: '/may-loc-nuoc-nhat-ban-mitsubishi-giai-phap-hoan-hao-cho-suc-khoe-gia-dinh.html',                         destination: '/blog' },
      { source: '/bon-cau-thong-minh-toto-ces9820-da-cach-mang-hoa-trai-nghiem-di-ve-sinh-nhu-the-nao.html',               destination: '/blog' },
      { source: '/huong-dan-chon-may-loc-nuoc-ion-kiem-nhat-ban-tot-nhat-cho-gia-dinh-ban.html',                           destination: '/blog' },
      { source: '/danh-gia-chi-tiet-dieu-hoa-daikin-urusara-x-dong-r.html',                                                destination: '/blog' },
      { source: '/may-rua-bat-panasonic-np-th5-tu-do-hay-rang-buoc.html',                                                  destination: '/blog' },

      // == CATCH-ALL: sản phẩm cũ (/:slug.html → /:slug) ==
      // Phải đặt SAU tất cả explicit redirects
      { source: '/:slug.html',   destination: '/:slug' },
      { source: '/:slug.html-1', destination: '/:slug' },
    ].map((r) => ({ ...r, permanent: true }))

    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'store.japanvip.vn' }],
        destination: 'https://japanvip.vn/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.japanvip.vn' }],
        destination: 'https://japanvip.vn/:path*',
        permanent: true,
      },
      ...oldSiteRedirects,
    ]
  },
  typedRoutes: false,
  serverExternalPackages: ['@prisma/client', '@japanvip/db', 'xlsx', 'playwright-core'],
  images: {
    formats: ['image/webp'],
    minimumCacheTTL: 31536000, // cache ảnh đã tối ưu 1 năm (giảm tải lại)
    remotePatterns: [
      { protocol: 'https', hostname: 'img.vietqr.io' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '*.r2.dev' },
      { protocol: 'https', hostname: '*.cloudflare.com' },
      { protocol: 'https', hostname: 'media.japanvip.vn' },
      { protocol: 'https', hostname: 'm.media-amazon.com' },
      { protocol: 'https', hostname: 'thumbnail.image.rakuten.co.jp' },
      // Scrape sources — ảnh lấy từ trang ngoài khi import bài viết / sản phẩm
      { protocol: 'https', hostname: 'congnghenhat.com' },
      { protocol: 'https', hostname: '*.congnghenhat.com' },
      { protocol: 'http', hostname: 'congnghenhat.com' },
      { protocol: 'https', hostname: 'phongcachnhat.vn' },
      { protocol: 'https', hostname: '*.phongcachnhat.vn' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Cho phép tải gtag.js/gtm.js (GA4/GTM) + fbevents.js (Meta Pixel) — nếu thiếu, CSP chặn tracking
              "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https:",
              "media-src 'self' https:",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
  poweredByHeader: false,
}

export default nextConfig
