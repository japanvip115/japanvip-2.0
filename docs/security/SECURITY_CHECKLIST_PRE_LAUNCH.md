# Checklist Bảo Mật Trước Khi Ra Mắt / Mở Rộng — Japan VIP

> Dùng trước mỗi đợt mở rộng (thêm khách, chạy quảng cáo lớn, mở tính năng mới).
> `[x]` = đã đạt theo hiện trạng · `[ ]` = còn pending, cần làm.
> DN nhỏ, chủ tự quản → ưu tiên các mục **PENDING** theo thứ tự rủi ro ở cuối file.

Cập nhật: 2026-06-28 · Stack: Next.js 15 (Vercel) · Neon PostgreSQL · Cloudflare · R2 · Upstash Redis · NextAuth v5 · VNPay

---

## 1. Domain & Security Headers

- [x] HSTS (`Strict-Transport-Security`) bật
- [x] CSP (Content-Security-Policy) có
- [x] `X-Frame-Options: DENY` + `frame-ancestors 'none'` (chống clickjacking)
- [x] `X-Content-Type-Options: nosniff`
- [x] `Referrer-Policy` cấu hình
- [x] `Permissions-Policy` cấu hình
- [x] `Cross-Origin-Opener-Policy: same-origin`
- [x] `Cross-Origin-Resource-Policy: same-site`
- [x] HTTPS bắt buộc toàn site (Cloudflare + Vercel)
- [ ] **CSP bỏ `'unsafe-inline'`** → chuyển sang nonce (hiện còn `'unsafe-inline'` cho GA4 / Meta Pixel)
- [ ] HSTS preload (đăng ký hstspreload.org) — tùy chọn, làm sau khi chắc chắn HTTPS ổn định

---

## 2. Secrets & Environment

- [x] Secret-scan trong CI (gitleaks) chặn secret lọt vào git
- [x] Secret lưu ở env (Vercel / `.env.local`), không hardcode
- [x] Cron secret so sánh bằng `timingSafeEqual` (chống timing attack)
- [x] CCCD / dữ liệu nhạy cảm khách hàng mã hóa AES (random salt)
- [ ] **Rotate secret định kỳ** (DB URL, NextAuth secret, VNPay, R2, token Facebook) — lập lịch 6–12 tháng/lần
- [ ] **Tách `.env.local` khỏi DB production** — hiện dev trỏ thẳng Neon prod (rủi ro ghi nhầm data thật). Tạo Neon branch cho dev
- [ ] Kiểm tra `.env*` đã nằm trong `.gitignore` (xác nhận lại trước mỗi đợt)

---

## 3. Auth & MFA

- [x] NextAuth v5 (JWT), mật khẩu hash bằng bcrypt
- [x] RBAC server-side + middleware (CUSTOMER < PARTNER < EDITOR < ADMIN < SUPER_ADMIN)
- [x] OTP: rate-limit cho verify/forgot/reset/resend/affiliate
- [x] OTP: `verifyOtp` atomic, dùng 1 lần (single-use)
- [x] OTP: sinh mã bằng `crypto.randomInt` (không dùng `Math.random`)
- [x] Open-redirect login đã chặn (chỉ nhận `callbackUrl` là path nội bộ)
- [ ] **MFA / 2FA cho tài khoản Admin** — CHƯA có. Bắt buộc trước khi mở rộng (admin là mục tiêu số 1)
- [ ] Khóa tạm tài khoản sau N lần đăng nhập sai (brute-force) — xác nhận đã có hay chưa
- [ ] Session timeout / buộc đăng nhập lại cho phiên admin lâu không hoạt động

---

## 4. Payments & Deposits (VNPay + đặt cọc)

- [x] VNPay webhook: kiểm tra chữ ký (signature)
- [x] VNPay webhook: so sánh chữ ký bằng `timingSafeEqual`
- [x] VNPay: số tiền lấy từ **DB**, không tin số tiền từ client/redirect
- [x] Chống price tampering (giá tính server-side, không nhận từ form)
- [x] Hoàn điểm / cộng điểm xử lý qua webhook (không tin client)
- [ ] Đối soát giao dịch định kỳ (xuất báo cáo VNPay vs đơn trong DB) — quy trình thủ công hằng tuần
- [ ] Test lại luồng cọc 30% + đổi trả 7 ngày / BH 12 tháng khớp chính sách hiện hành
- [ ] Idempotency cho webhook (1 mã giao dịch xử lý đúng 1 lần, kể cả khi VNPay gọi lại) — xác nhận lại

---

## 5. Auction Integrity (Đấu giá)

- [x] Chống race condition khi kết thúc phiên (`endAuction`)
- [x] Giới hạn auto-extend (chống kéo dài vô hạn)
- [x] Chống shill-bid (tự đẩy giá)
- [x] Auto-bid: ràng buộc trách nhiệm / giới hạn
- [x] Tỷ giá quy đổi kiểm soát server-side
- [ ] Rà soát log đấu giá bất thường định kỳ (bid lạ, tài khoản mới bid cao) — quy trình thủ công
- [ ] Giới hạn tần suất đặt bid mỗi user (rate-limit chống spam bid) — xác nhận đã có

---

## 6. URL Import / SSRF (Mua Hộ + Scraper)

- [x] Image-proxy chặn IP nội bộ / link-local / metadata (169.254.x.x)
- [x] Image-proxy: `redirect: 'error'`, chỉ nhận `content-type: image`, cap 15MB
- [ ] **SSRF các scraper khác** (`parse-url`, `scrape-*`, `blog-scraper`) — CHƯA vá, nằm trong **vùng khóa** 🔒, cần chủ DN mở khóa mới sửa
- [ ] Áp cùng allowlist/blocklist IP cho mọi route fetch URL bên ngoài (sau khi mở khóa)
- [ ] Timeout + giới hạn kích thước response cho mọi scraper (chống treo/OOM)

---

## 7. Uploads

- [x] Chỉ nhận image / video
- [x] Kiểm tra magic-byte (chống giả MIME)
- [x] Tên file UUID (chống path traversal / ghi đè)
- [x] Lưu trên R2 (tách khỏi server)
- [x] Rate-limit upload
- [x] Chứng từ khách: chỉ ảnh, ≤ 10MB
- [x] `serverActions.bodySizeLimit` hạ còn 10MB
- [ ] **Quét malware cho file upload** — CHƯA tích hợp (cân nhắc dịch vụ scan trước khi cho upload rộng rãi)
- [ ] Serve file upload từ domain/subdomain riêng (cô lập, chống XSS qua nội dung file)

---

## 8. API & Validation

- [x] SQL parameterized toàn bộ (Prisma — chống SQL injection)
- [x] XSS: `sanitize-html` cho render blog & mô tả sản phẩm
- [x] Ẩn lỗi 500 (không lộ message Prisma / stack ra client)
- [x] Rate-limit (Upstash Redis) cho các route nhạy cảm (OTP, upload)
- [ ] Rà soát mọi route admin/API đều check quyền server-side (không chỉ ẩn nút ở UI)
- [ ] Validation input đầu vào (zod/schema) cho **mọi** API route ghi dữ liệu — xác nhận phủ hết
- [ ] Rate-limit mở rộng cho các endpoint công khai khác (search, parse-url, contact form)

---

## 9. Cloudflare / WAF

- [x] Cloudflare CDN/DNS đứng trước (proxy bật — ẩn IP gốc Vercel)
- [ ] **Bật WAF** (Managed Rules / OWASP ruleset)
- [ ] **Turnstile / CAPTCHA** cho form đăng ký, đăng nhập, OTP, liên hệ (chống bot)
- [ ] **Bot Fight Mode** bật
- [ ] **Bảo vệ origin IP** — chỉ cho Cloudflare gọi tới Vercel (Authenticated Origin Pulls / chặn truy cập trực tiếp)
- [ ] Rate-limiting rule ở tầng Cloudflare (chặn flood trước khi tới app)

---

## 10. Monitoring & Backup

- [x] Neon có PITR / branch (khôi phục dữ liệu theo thời điểm)
- [ ] **Sentry** (error tracking) — CHƯA có
- [ ] **Uptime monitoring** (báo khi site down) — CHƯA có
- [ ] Alert khi có lỗi 500 tăng bất thường / webhook thanh toán fail
- [ ] Kiểm tra định kỳ: thử khôi phục từ backup Neon (đảm bảo backup thật sự dùng được)
- [ ] Lưu log audit hành động admin (ai sửa giá, xóa user, đổi setting) — xác nhận đã có audit log

---

## 11. CI/CD & Dependencies

- [x] CI chạy typecheck / lint / `npm audit` / gitleaks (secret-scan)
- [x] Dependabot bật (tự cảnh báo + PR vá lỗ hổng dep)
- [x] CVE deps `undici` / `nodemailer` / `postcss` đã override lên bản vá
- [ ] **`xlsx` có CVE, chưa có bản vá npm** → giảm rủi ro: chỉ parse file admin tin cậy; cân nhắc đổi sang `exceljs`
- [ ] Chạy `next build` trước mỗi lần push (tsc bỏ sót lỗi build runtime)
- [ ] Staging env tách prod — CHƯA có (test trên môi trường riêng trước khi lên prod)
- [ ] Rà `npm audit` định kỳ + cập nhật dep theo PR Dependabot (đừng để tồn đọng)

---

## Ưu tiên xử lý PENDING (cho DN nhỏ — làm theo thứ tự)

| # | Việc | Nhóm | Vì sao gấp | Công sức |
|---|---|---|---|---|
| 1 | **MFA/2FA cho admin** | §3 | Admin bị chiếm = mất cả site + data khách | Trung bình |
| 2 | **Bật Cloudflare WAF + Turnstile + Bot Fight** | §9 | Chặn 80% tấn công tự động ngay tại cổng, bật bằng dashboard | Thấp (cấu hình) |
| 3 | **Bảo vệ origin IP** (chỉ CF gọi Vercel) | §9 | Tránh bị bỏ qua Cloudflare đánh thẳng | Thấp–TB |
| 4 | **Tách `.env.local` khỏi Neon prod** (dùng branch dev) | §2 | Tránh ghi/xóa nhầm dữ liệu thật khi dev | Thấp |
| 5 | **Sentry + Uptime monitor** | §10 | Biết khi site lỗi/down trước khi khách báo | Thấp |
| 6 | **SSRF scraper còn lại** (mở vùng khóa) | §6 | Có thể bị lợi dụng gọi mạng nội bộ | TB (cần mở khóa) |
| 7 | **Quét malware upload** | §7 | Khách/CTV upload file → rủi ro phát tán | TB |
| 8 | **CSP bỏ `'unsafe-inline'` → nonce** | §1 | Siết XSS triệt để | TB |
| 9 | **Đổi `xlsx` → `exceljs`** | §11 | CVE không có bản vá | TB |
| 10 | **Rotate secret định kỳ** | §2 | Giảm thiệt hại nếu secret lộ | Thấp (định kỳ) |

---

## Quy trình tối thiểu mỗi đợt mở rộng

1. Chạy `next build` + CI xanh (typecheck/lint/audit/gitleaks).
2. Rà lại §3 (MFA admin), §9 (WAF), §4 (đối soát thanh toán) — 3 nhóm rủi ro cao nhất.
3. Kiểm tra Dependabot không còn cảnh báo nghiêm trọng tồn đọng.
4. Xác nhận backup Neon còn hoạt động (PITR điểm gần nhất).
5. Soát log đấu giá / đơn hàng bất thường tuần gần nhất.

> Mọi mục `[ ]` không phải lỗi đang khai thác — là việc cần làm để **giảm rủi ro khi quy mô tăng**. Làm theo thứ tự ưu tiên ở trên, không cần làm hết cùng lúc.
