# Hướng Dẫn Setup Máy Mới — Japan VIP 2.0

## 1. Yêu Cầu Môi Trường

| Phần mềm | Phiên bản | Tải về |
|---|---|---|
| Node.js | v20+ (khuyến nghị v22+) | https://nodejs.org |
| pnpm | v9+ | `npm install -g pnpm` |
| Git | Mới nhất | https://git-scm.com |

---

## 2. Clone Code Từ GitHub

```bash
git clone https://github.com/japanvip115/japanvip-2.0.git
cd japanvip-2.0
```

---

## 3. Copy File `.env.local`

> Lấy file `.env.local` từ **Dropbox / Google Drive** mà bạn đã lưu, rồi đặt vào:

```
japanvip-2.0/
└── apps/
    └── web/
        └── .env.local   ← đặt vào đây
```

### Danh sách biến trong `.env.local`:

```env
# Database (Neon PostgreSQL)
DATABASE_URL=
DIRECT_URL=

# Auth (NextAuth)
AUTH_URL=
AUTH_SECRET=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
NEXT_PUBLIC_APP_URL=

# Mã hoá
ENCRYPTION_KEY=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# Cloudflare R2 (Storage)
CLOUDFLARE_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

---

## 4. Cài Đặt Dependencies

```bash
pnpm install
```

---

## 5. Migrate Database

> Chỉ cần chạy lần đầu hoặc khi có migration mới:

```bash
pnpm --filter @japanvip/db db:push
```

Hoặc:

```bash
cd packages/db
npx prisma db push
```

---

## 6. Chạy Dev Server

```bash
pnpm dev
```

Mở trình duyệt: **http://localhost:3000**

---

## 7. Kiểm Tra Kết Nối

Sau khi chạy dev server, kiểm tra:

- [ ] Trang chủ hiển thị bình thường
- [ ] Đăng nhập admin: `/admin`
- [ ] Upload ảnh hoạt động (R2)
- [ ] Database load được sản phẩm

---

## 8. Deploy Lên Production

> Chỉ deploy khi được chủ dự án yêu cầu.

```bash
git add .
git commit -m "feat: mô tả thay đổi"
git push origin main
```

Vercel sẽ tự động build và deploy lên **store.japanvip.vn**.

---

## 9. Cấu Trúc Thư Mục

```
japanvip-2.0/
├── apps/
│   └── web/                  # Next.js 15 app
│       ├── src/
│       │   ├── app/          # App Router (pages + API routes)
│       │   ├── components/   # UI components
│       │   ├── lib/          # Utilities
│       │   └── modules/      # Business logic
│       └── .env.local        # ← file secrets (không có trên GitHub)
├── packages/
│   ├── db/                   # Prisma schema + client
│   └── utils/                # Shared utilities
└── SETUP.md                  # File này
```

---

## 10. Lưu Ý Quan Trọng

- **Không commit `.env.local`** lên GitHub
- **Database** dùng Neon (cloud) — không cần cài PostgreSQL local
- **Redis** dùng Upstash (cloud) — không cần cài Redis local
- **Ảnh** lưu trên Cloudflare R2 — truy cập qua `media.japanvip.vn`
- **Production** deploy tự động qua Vercel khi push lên `main`
