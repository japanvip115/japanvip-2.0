# Kế hoạch khắc phục bảo mật — JapanVip (japanvip.vn)

> Tài liệu hành động cho DN nhỏ tự quản. Sắp theo **phase ưu tiên**: làm xong Phase trên rồi mới xuống Phase dưới.
> Quy ước: `[x]` = đã làm/đã vá · `[ ]` = chưa làm. Mỗi mục có **cách làm ngắn** + **Test sau khi vá**.
> Cập nhật: 2026-06-28. Stack: Next.js 15 (Vercel) · Neon Postgres · Cloudflare CDN/DNS · R2 · Upstash Redis · NextAuth v5 · VNPay.

---

## Phase 0 — Blocker production (PHẢI xong trước/ngay khi go-live)

Những thứ nếu thiếu thì coi như chưa an toàn để chạy thật.

| | Hạng mục | Cách làm ngắn | Test sau khi vá |
|---|---|---|---|
| [x] | **Security headers** (HSTS, CSP, X-Frame DENY, nosniff, Referrer-Policy, Permissions-Policy, COOP, CORP, frame-ancestors 'none') | Khai báo trong `apps/web/next.config.ts` (đã có, dòng ~52–71) | `curl -I https://japanvip.vn` thấy đủ header; thử nhúng site vào `<iframe>` → bị chặn |
| [x] | **Ẩn lỗi 500** (không lộ message Prisma/stack) | Handler trả message chung, log chi tiết ở server | Gây lỗi 1 API → response chỉ có message chung, không có tên bảng/cột |
| [x] | **Cron secret** so sánh `timingSafeEqual` | Endpoint cron kiểm `Authorization` bằng timing-safe | Gọi cron sai secret → 401; đúng secret → 200 |
| [x] | **Open-redirect login** chỉ nhận `callbackUrl` path nội bộ | Validate callbackUrl bắt đầu bằng `/`, từ chối URL tuyệt đối | Login với `?callbackUrl=https://evil.com` → không redirect ra ngoài |
| [x] | **Secret-scan CI** (gitleaks) + Dependabot | `.github/workflows/ci.yml` đã có gitleaks; bật Dependabot | Push commit có key giả → gitleaks cảnh báo trong Actions |
| [ ] | **Rà secret đã từng commit / lộ** | `git log -p` quét key cũ; nếu lộ → **rotate ngay** (Neon, R2, VNPay, NextAuth `AUTH_SECRET`, Upstash, SMTP) | Sau rotate, key cũ gọi API → fail; app vẫn chạy bằng key mới |
| [ ] | **Tách `.env` khỏi repo + xác nhận `.gitignore`** | Đảm bảo `.env*` không bị track; biến nhạy cảm chỉ đặt ở Vercel env | `git ls-files | grep -i env` không ra file chứa secret thật |
| [ ] | **Bật Cloudflare "Full (strict)" SSL + Always Use HTTPS** | Cloudflare → SSL/TLS = Full (strict); bật HSTS phía CF | Truy cập `http://` → ép sang `https://`; SSL Labs ≥ A |

---

## Phase 1 — Auth / Authz / Payment / Auction (lõi tiền + tài khoản)

Đụng trực tiếp tới tiền và quyền — sai một chỗ là mất tiền/mất tài khoản.

| | Hạng mục | Cách làm ngắn | Test sau khi vá |
|---|---|---|---|
| [x] | **RBAC server-side + middleware** (CUSTOMER<PARTNER<EDITOR<ADMIN<SUPER_ADMIN) | Check role trong `middleware.ts` + lại trong từng route admin | User thường gọi `/api/v1/admin/*` → 403; đổi role trong JWT giả → vẫn 403 (check ở server) |
| [x] | **Mật khẩu bcrypt** | Hash bcrypt khi đăng ký/đổi pass | Xem DB: cột password là chuỗi `$2b$...`, không phải plaintext |
| [x] | **OTP an toàn**: rate-limit verify/forgot/reset/resend/affiliate; verify atomic single-use; sinh mã `crypto.randomInt` | Đã vá toàn bộ luồng OTP | Nhập sai OTP nhiều lần → bị chặn; dùng lại OTP đã verify → fail; brute-force 6 số → bị rate-limit |
| [x] | **VNPay webhook**: verify chữ ký + `timingSafeEqual` + lấy amount từ DB (không tin amount từ client) | So `vnp_SecureHash`, đối chiếu số tiền với đơn trong DB | Gửi webhook sửa amount → bị từ chối; sai hash → bị từ chối |
| [x] | **Chống price-tampering / race endAuction / shill-bid / auto-bid liability** (Session 06-20e Phase 1+2) | Giá tính lại ở server; khoá race khi chốt phiên; chặn tự đấu giá của mình | Đặt giá < bước giá → bị từ chối; 2 request chốt phiên đồng thời → chỉ 1 thắng |
| [x] | **Rate-limit** (Upstash Redis) cho endpoint nhạy cảm | `apps/web/src/lib/rate-limit.ts` | Spam login/OTP → nhận 429 sau ngưỡng |
| [ ] | **Admin MFA / 2FA** (chưa có) | Bật TOTP cho tài khoản ADMIN/SUPER_ADMIN (authenticator app); bắt buộc với role admin | Login admin không có mã 2FA → không vào được dashboard |
| [ ] | **Session security**: TTL JWT hợp lý + logout thu hồi + cookie `HttpOnly/Secure/SameSite` | Rà cấu hình NextAuth (maxAge, cookies) | Cookie phiên có cờ HttpOnly+Secure; hết hạn → bắt login lại |
| [ ] | **Audit log hành động admin** (đổi giá, duyệt CTV, hoàn tiền) | Ghi log ai-làm-gì-khi-nào vào bảng AuditLog | Đổi giá 1 SP → có 1 dòng log kèm userId + thời điểm |

---

## Phase 2 — SSRF import / API / Upload (vùng nhập liệu ngoài)

Nơi server tự đi tải/parse nội dung từ Internet — rủi ro SSRF, MIME giả, file độc.

| | Hạng mục | Cách làm ngắn | Test sau khi vá |
|---|---|---|---|
| [x] | **SSRF image-proxy** chặn IP nội bộ/link-local/metadata (127/10/172.16/192.168/169.254) + `redirect:'error'` + chỉ nhận content-type `image/*` + cap 15MB | `apps/web/src/app/api/v1/admin/ai/image-proxy/route.ts` | Gọi proxy với `?url=http://169.254.169.254/...` → bị chặn; URL trả HTML → bị từ chối |
| [x] | **Upload an toàn**: chỉ image/video, tên UUID, lưu R2, rate-limit, **kiểm magic-byte** chống giả MIME; chứng từ khách chỉ ảnh ≤10MB | Validate đuôi + magic-byte ở server, không tin Content-Type | Đổi `shell.php` thành `.jpg` → bị từ chối vì magic-byte sai |
| [x] | **XSS render** blog & mô tả SP: `sanitize-html` | `apps/web/src/lib/sanitize-content.ts` áp khi render | Nhét `<script>` vào mô tả → render ra text, không chạy JS |
| [x] | **SQL Injection**: Prisma parameterized 100% | Không nối chuỗi SQL thủ công | Nhập `' OR 1=1--` vào ô tìm kiếm → không lộ dữ liệu |
| [x] | **serverActions bodySizeLimit** hạ còn 10mb | Cấu hình trong `next.config.ts` | POST body > 10mb → bị từ chối |
| [ ] | **SSRF các scraper còn lại** (parse-url, scrape-japan, scrape-feature-images, scrape-vn-reference, blog-scraper) — **VÙNG KHOÁ**, cần chủ DN mở khoá mới sửa | Áp cùng guard như image-proxy: chặn IP nội bộ, `redirect:'error'`, allowlist host (amazon/kakaku/trang VN), timeout, cap size | Dán URL `http://localhost`/`169.254...` vào ô parse → bị từ chối; URL hợp lệ → vẫn chạy |
| [ ] | **Validate input đầu vào API** (zod/schema) cho mọi route nhận body từ client | Thêm schema validate ở các route quan trọng nếu chưa có | Gửi field thừa/sai kiểu → 400, không crash |
| [ ] | **Malware-scan cho file upload** (tăng cường) | Tích hợp ClamAV/dịch vụ quét trước khi public file khách upload | Upload file test EICAR → bị chặn |
| [ ] | **`xlsx` có CVE, chưa có bản vá npm** | Giảm rủi ro: chỉ parse file từ admin tin cậy; **cân nhắc đổi sang `exceljs`** | Sau khi đổi: import file Excel admin vẫn đọc đúng; `pnpm audit` không còn cảnh báo xlsx |

---

## Phase 3 — Hạ tầng / Monitoring / Backup / WAF / CI

Lớp phòng thủ ngoài + khả năng phát hiện & phục hồi khi có sự cố.

| | Hạng mục | Cách làm ngắn | Test sau khi vá |
|---|---|---|---|
| [x] | **CI** typecheck + lint + audit + gitleaks | `.github/workflows/ci.yml` (đã có) | Mở PR → 4 job chạy trong Actions |
| [x] | **CVE deps** undici/nodemailer/postcss override lên bản vá | `pnpm.overrides` trong `package.json` | `pnpm why undici` ra phiên bản ≥ ngưỡng vá |
| [x] | **Git hook** khoá-bằng-câu-xác-nhận cho vùng LOCKED | `.githooks/pre-commit` | Sửa file LOCKED rồi commit → bị chặn cho tới khi gõ câu xác nhận |
| [ ] | **Cloudflare WAF + bot protection + Turnstile** (chưa bật) | Bật WAF managed ruleset; Turnstile cho form login/OTP/đăng ký; bật bot fight mode | Gửi payload tấn công phổ biến → CF chặn; bot spam form → bị Turnstile chặn |
| [ ] | **Bảo vệ origin-IP** (ẩn IP Vercel, chỉ nhận traffic qua Cloudflare) | Dùng Vercel + CF đúng cách; chặn truy cập trực tiếp bypass CF nếu có thể | Gọi thẳng origin không qua CF → không phục vụ / bị chặn |
| [ ] | **Sentry + uptime monitoring** (chưa có) | Cài Sentry cho Next.js (lọc PII); UptimeRobot/Cron-job.org ping `/` + healthcheck | Gây lỗi → thấy event trong Sentry; tắt site thử → nhận cảnh báo uptime |
| [ ] | **Backup DB có kiểm chứng** | Neon đã có PITR/branch — **diễn tập restore** 1 lần ra branch, xác nhận khôi phục được | Tạo branch từ thời điểm cũ → dữ liệu đúng; ghi lại RPO/RTO thực tế |
| [ ] | **Staging tách prod** (chưa có) | Tạo Neon branch + Vercel preview env riêng cho staging; **không trỏ DB dev vào prod** | Đổi data ở staging → prod không bị ảnh hưởng |
| [ ] | **CSP bỏ `'unsafe-inline'` → dùng nonce** (cho GA4/Meta Pixel) | Sinh nonce mỗi request, gắn vào script GA/Pixel, siết `script-src` | Inline script lạ không có nonce → bị CSP chặn; GA4/Pixel vẫn chạy |
| [ ] | **Quy trình rotate secret định kỳ** | Lịch 6–12 tháng rotate AUTH_SECRET/VNPay/R2/Neon/SMTP; ghi checklist | Có file/lịch nhắc rotate; lần rotate gần nhất được ghi nhận |

---

## Phase 4 — Test hồi quy bảo mật + Checklist launch

Chạy lại trước mỗi lần deploy lớn để chắc các bản vá không bị hồi quy.

**Test hồi quy (chạy lại định kỳ):**
- [ ] **Headers**: `curl -I https://japanvip.vn` đủ HSTS/CSP/X-Frame/nosniff/Referrer/Permissions/COOP/CORP.
- [ ] **Authz**: user thường gọi `/api/v1/admin/*` → 403; sửa role trong token giả → vẫn 403.
- [ ] **OTP/rate-limit**: brute-force OTP & spam login → 429; OTP single-use không tái sử dụng.
- [ ] **VNPay**: webhook sai hash / sửa amount → từ chối; đối chiếu amount với DB.
- [ ] **Auction**: giá dưới bước giá bị chặn; 2 request chốt phiên đồng thời chỉ 1 thắng.
- [ ] **SSRF image-proxy**: `169.254.169.254` / `localhost` / `10.x` → chặn; URL HTML → chặn.
- [ ] **Upload**: file giả MIME (đổi đuôi) → chặn theo magic-byte; >10MB → chặn.
- [ ] **XSS**: `<script>`/`onerror=` trong mô tả & blog → bị sanitize.
- [ ] **Open-redirect**: `?callbackUrl=https://evil.com` khi login → không redirect ngoài.
- [ ] **500 leak**: gây lỗi → không lộ message Prisma/stack.
- [ ] **`pnpm audit --audit-level=high`** & **gitleaks** sạch (hoặc chỉ còn xlsx đã ghi nhận).

**Checklist go-live (tick trước khi bật chính thức):**
- [ ] Phase 0 đã `[x]` toàn bộ (đặc biệt: rotate secret, .env sạch, Cloudflare SSL strict).
- [ ] Admin **2FA** đã bật (Phase 1).
- [ ] Cloudflare **WAF + Turnstile** đã bật (Phase 3).
- [ ] **Sentry + uptime** đang chạy và có nơi nhận cảnh báo (email/Telegram).
- [ ] Đã **diễn tập restore DB** từ Neon ít nhất 1 lần.
- [ ] **Staging tách prod**, DB dev không còn trỏ thẳng vào Neon prod.
- [ ] Tất cả **test hồi quy** ở trên đã pass.

---

## Tóm tắt trạng thái

| Phase | Đã vá | Còn pending |
|---|---|---|
| 0 — Blocker | 5 | 3 (rotate secret, .env sạch, CF SSL strict) |
| 1 — Auth/Pay/Auction | 6 | 3 (Admin 2FA, session hardening, audit log) |
| 2 — SSRF/API/Upload | 5 | 4 (SSRF scraper khoá, validate input, malware-scan, xlsx→exceljs) |
| 3 — Hạ tầng/Monitor | 3 | 6 (WAF+Turnstile, origin-IP, Sentry+uptime, backup drill, staging, CSP nonce, rotate lịch) |
| 4 — Test hồi quy | — | bộ checklist chạy mỗi lần deploy lớn |

**Ưu tiên làm tiếp ngay (impact cao, công sức vừa):** ① rotate + soát secret (P0) → ② Admin 2FA (P1) → ③ bật Cloudflare WAF + Turnstile (P3) → ④ Sentry + uptime (P3) → ⑤ diễn tập restore Neon (P3).

> Ghi chú vùng khoá: SSRF cho các scraper (`parse-url`, `scrape-*`, `blog-scraper`) nằm trong **vùng LOCKED** theo `CLAUDE.md` — **phải được chủ DN (Nguyễn Thị Giang) mở khoá** trong phiên hiện tại trước khi sửa.
