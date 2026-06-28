# Báo cáo Audit Bảo Mật 2026 — Japan VIP (japanvip.vn)

> Phạm vi: web app Next.js 15 (App Router) trên Vercel, DB PostgreSQL Neon, Cloudflare CDN/DNS, R2 lưu ảnh, Upstash Redis, NextAuth v5, thanh toán VNPay. Đối tượng đọc: chủ DN (DN nhỏ, tự quản). Ngày: 2026-06.

## Tóm tắt điều hành

Hệ thống đã được củng cố tốt ở các lỗ hổng nền tảng quan trọng nhất: phần lớn rủi ro OWASP Top 10 (XSS, SQL Injection, SSRF qua image-proxy, OTP brute-force, open-redirect, webhook giả mạo, lộ lỗi hệ thống) **đã được vá** và xác nhận có file/cơ chế tương ứng. Quản trị quyền (RBAC) chặt theo server, security headers đầy đủ, secret so sánh bằng `timingSafeEqual`, upload kiểm magic-byte. Rủi ro còn lại **không nằm ở code lõi** mà ở **lớp vận hành/hạ tầng chưa bật** (Cloudflare WAF/Turnstile, ẩn IP origin, MFA cho admin, giám sát/Sentry, môi trường staging tách prod) và **một số scraper trong vùng code đã khóa** (cần chủ DN mở khóa mới vá SSRF). Khuyến nghị ưu tiên 3 việc rẻ-mà-hiệu-quả: (1) bật Cloudflare WAF + Turnstile + ẩn IP origin, (2) bật 2FA cho tài khoản admin, (3) gắn Sentry + uptime monitor. Không phát hiện lỗ hổng Critical còn mở.

---

## CRITICAL — lỗ hổng nghiêm trọng (chiếm quyền / mất tiền / rò dữ liệu hàng loạt)

| Mục | Trạng thái | File liên quan | Rủi ro ngắn | Khuyến nghị |
|---|---|---|---|---|
| SQL Injection | ✅ Đã vá | Toàn bộ truy vấn qua Prisma (parameterized) | Chèn SQL đọc/xóa DB | Giữ nguyên — cấm dùng `$queryRawUnsafe` / nối chuỗi SQL |
| Giả mạo webhook thanh toán VNPay | ✅ Đã vá | `apps/web/src/app/api/v1/webhooks/vnpay/route.ts`, `lib/payments/vnpay.ts` | Báo "đã thanh toán" giả để chiếm hàng | Đã ký + `timingSafeEqual` + lấy `amount` từ DB. Giữ nguyên |
| Lộ lỗi 500 (message Prisma/stack) | ✅ Đã vá | handler API chung | Lộ cấu trúc DB/đường dẫn cho kẻ tấn công | Giữ nguyên — không trả message nội bộ ra client |
| Chiếm tài khoản admin (không có 2FA) | ⚠️ Pending | NextAuth config (`auth.ts` / `app/(auth)`) | 1 mật khẩu admin lộ = mất toàn quyền | Bật **MFA/2FA** (TOTP) cho ADMIN/SUPER_ADMIN — ưu tiên cao nhất |

---

## HIGH — rủi ro cao (truy cập trái phép / lạm dụng / DoS)

| Mục | Trạng thái | File liên quan | Rủi ro ngắn | Khuyến nghị |
|---|---|---|---|---|
| XSS (render blog & mô tả SP) | ✅ Đã vá | `apps/web/src/lib/sanitize-content.ts` | Chèn `<script>` đánh cắp session/redirect | Giữ sanitize-html cho mọi HTML do user/AI sinh ra |
| OTP brute-force / tái dùng mã | ✅ Đã vá | `lib/otp.service.ts`; routes `auth/verify-email`, `forgot-password`, `reset-password`, `resend-otp`, `partner/send-otp` | Dò mã 6 số chiếm tài khoản | Đã rate-limit + verify atomic single-use + `crypto.randomInt`. Giữ nguyên |
| SSRF qua image-proxy | ✅ Đã vá | `apps/web/src/app/api/v1/admin/ai/image-proxy/route.ts` | Server bị ép gọi IP nội bộ/metadata cloud | Đã chặn IP nội bộ/link-local/`169.254`, `redirect:'error'`, chỉ nhận content-type image, cap 15MB. Giữ nguyên |
| SSRF ở các scraper khác | ⚠️ Pending | `lib/blog-scraper.ts`, `bfj/parse-url/route.ts`, `admin/ai/scrape-*`, `admin/products/scrape` | Cùng rủi ro SSRF, nhưng các route này nằm trong **vùng code đã khóa** | Mở khóa có kiểm soát → áp đúng guard như image-proxy (chặn IP nội bộ + `redirect:'error'` + chỉ admin) |
| Phân quyền (RBAC) | ✅ Đã vá | `middleware.ts` + kiểm tra server từng route | Khách thường gọi API admin | Đã RBAC server-side + middleware (CUSTOMER<PARTNER<EDITOR<ADMIN<SUPER_ADMIN). Giữ nguyên |
| Open-redirect khi đăng nhập | ✅ Đã vá | NextAuth callback / `(auth)` | Lừa nạn nhân tới site giả qua `callbackUrl` | Đã chỉ nhận `callbackUrl` là path nội bộ. Giữ nguyên |
| WAF / chống bot / ẩn IP origin | ⚠️ Pending | Cloudflare (cấu hình ngoài code) | Bot quét, brute-force, DDoS, lộ IP server gốc | Bật **Cloudflare WAF + Turnstile** ở form login/OTP + **bảo vệ IP origin** (chỉ nhận traffic qua Cloudflare) |
| Upload file độc hại | ✅ Đã vá | `api/v1/admin/upload`, `partner/upload`, `bfj/upload-proof` | Tải mã độc / giả MIME | Đã chỉ nhận image/video, tên UUID, lưu R2, rate-limit, kiểm magic-byte; chứng từ khách ≤10MB. Giữ nguyên |

---

## MEDIUM — rủi ro vừa (cứng hóa / phụ thuộc / cấu hình)

| Mục | Trạng thái | File liên quan | Rủi ro ngắn | Khuyến nghị |
|---|---|---|---|---|
| Security headers (HSTS/CSP/X-Frame…) | ✅ Đã vá | `middleware.ts` / `next.config` | Clickjacking, sniff MIME, rò referrer | Đủ HSTS, CSP, X-Frame DENY, nosniff, Referrer-Policy, Permissions-Policy, COOP/CORP, `frame-ancestors 'none'`. Giữ nguyên |
| CSP còn `'unsafe-inline'` | ⚠️ Pending | `middleware.ts` (CSP cho GA4/Meta Pixel) | Giảm hiệu lực chống XSS inline | Chuyển sang **nonce** cho script GA4/Pixel, bỏ `'unsafe-inline'` |
| Cron endpoint giả mạo | ✅ Đã vá | `api/v1/cron/*` (publish-blog/scheduled/facebook/warm/marketing) | Kích cron trái phép | Đã so secret bằng `timingSafeEqual`. Giữ nguyên |
| CVE thư viện (undici/nodemailer/postcss) | ✅ Đã vá | `package.json` (override) | Lỗ hổng qua dependency | Đã override lên bản vá. Giữ chạy `audit` định kỳ |
| `xlsx` có CVE chưa có bản vá npm | ⚠️ Pending | nơi import `xlsx` (gen file/parse admin) | Prototype pollution/ReDoS khi parse file | Chỉ parse file của admin tin cậy; **cân nhắc đổi sang `exceljs`** |
| CI/CD & quét secret | ✅ Đã vá | GitHub Actions (typecheck/lint/audit/gitleaks) + Dependabot | Lọt secret/lỗ hổng vào repo | Giữ nguyên; bật cảnh báo Dependabot qua email |
| Giới hạn body server action | ✅ Đã vá | `next.config` (`bodySizeLimit` 10mb) | Nuốt RAM / DoS qua payload lớn | Giữ nguyên |
| Giám sát lỗi & uptime | ⚠️ Pending | (chưa tích hợp) | Sự cố/bị tấn công không ai biết | Gắn **Sentry** + **uptime monitor** (UptimeRobot/Better Stack) |
| Môi trường staging tách prod | ⚠️ Pending | hạ tầng Vercel/Neon | Test đụng data thật (DB dev = Neon prod) | Tạo Neon branch + Vercel preview env riêng cho staging |

---

## LOW — rủi ro thấp (vệ sinh bảo mật / quy trình)

| Mục | Trạng thái | File liên quan | Rủi ro ngắn | Khuyến nghị |
|---|---|---|---|---|
| Băm mật khẩu | ✅ Đã vá | NextAuth provider | Lộ mật khẩu nếu rò DB | Dùng bcrypt — giữ nguyên |
| Sinh mã/secret ngẫu nhiên | ✅ Đã vá | `lib/otp.service.ts` (`crypto.randomInt`) | Mã đoán được | Giữ nguyên |
| Xoay (rotate) secret định kỳ | ⚠️ Pending | `.env` (Vercel) | Secret cũ lộ lâu ngày | Lịch xoay 6–12 tháng: NEXTAUTH_SECRET, VNPay, R2, DB |
| Quét malware cho file upload | ⚠️ Pending | route upload | File ảnh/video nhúng payload | Cân nhắc quét (ClamAV/dịch vụ) cho upload công khai |
| Audit logging / theo dõi IP | ✅ Đã vá | rate-limit Upstash + logging | Không truy vết được hành vi bất thường | Giữ nguyên; định kỳ rà log đăng nhập/admin |

---

## Thống kê

| Mức độ | Đã vá ✅ | Pending ⚠️ |
|---|---|---|
| Critical | 3 | 1 |
| High | 6 | 2 |
| Medium | 5 | 4 |
| Low | 3 | 3 |
| **Tổng** | **17** | **10** |

**Tổng quát:** 17 mục đã vá / 10 mục pending. **Không còn lỗ hổng Critical đang mở dạng "chiếm quyền/mất tiền tức thời"** — điểm Critical pending duy nhất là **bật 2FA cho admin** (phòng ngừa, làm ngay).

### 3 việc làm trước (rẻ, hiệu quả cao)
1. **Bật 2FA (TOTP) cho admin** — chặn chiếm tài khoản nếu mật khẩu lộ.
2. **Bật Cloudflare WAF + Turnstile + ẩn IP origin** — chặn bot/brute-force/DDoS ở lớp ngoài, không cần đổi code.
3. **Gắn Sentry + uptime monitor** — biết ngay khi web lỗi hoặc bị tấn công.

### Việc cần mở vùng code khóa
- Vá **SSRF cho các scraper còn lại** (`blog-scraper`, `parse-url`, `scrape-*`, `products/scrape`): áp đúng guard như `image-proxy`. Cần chủ DN mở khóa vùng AI Writer / BFJ trước khi sửa.
