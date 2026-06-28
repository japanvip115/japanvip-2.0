# Sổ tay Ứng cứu Sự cố — Japan VIP (japanvip.vn)

> Tài liệu này để **chủ DN / người trực tự xử lý khi có sự cố bảo mật**. Đọc nhanh, làm theo. Không lý thuyết.
> Khi sự cố đang xảy ra: **bình tĩnh, làm theo 5 bước, ghi lại mọi thao tác kèm giờ (UTC+7)**.

---

## 0. Khi nghi có sự cố — làm ngay 3 việc

1. **Mở một file ghi nhật ký** (Notes / Google Doc): ghi giờ phát hiện, dấu hiệu, ai đang xử lý.
2. **KHÔNG xoá log, KHÔNG xoá bằng chứng.** Cần để điều tra sau.
3. Xác định mức độ (xem bảng dưới) → quyết định có cần ngắt site không.

| Mức | Dấu hiệu | Phản ứng |
|---|---|---|
| 🟢 Thấp | Spam form, 1 IP abuse nhẹ | Rate-limit / chặn IP, theo dõi |
| 🟡 Vừa | Nghi lộ 1 key, login lạ, lỗi 500 hàng loạt | Rotate key liên quan, soát log |
| 🔴 Cao | Lộ DB/secret, chiếm admin, rò dữ liệu khách, DDoS | **Bật Under Attack + rotate toàn bộ + xem kịch bản** |

---

## 1. Quy trình 5 bước (áp dụng cho MỌI sự cố)

| Bước | Việc cần làm |
|---|---|
| **1. Phát hiện** | Xác nhận có thật sự là sự cố. Nguồn: cảnh báo Vercel/Neon/Cloudflare, log lỗi, khách báo, GitHub secret-scan/gitleaks (CI đã bật). Chụp màn hình, lưu log. |
| **2. Cô lập** | Chặn đường lan: rotate key đã lộ, chặn IP, bật Cloudflare Under Attack, tạm khoá tài khoản nghi bị chiếm, tắt tính năng dính lỗi. **Mục tiêu: ngăn thiệt hại tiếp diễn — chưa cần sửa gốc.** |
| **3. Khắc phục** | Vá nguyên nhân gốc: deploy bản vá, gỡ mã độc, sửa cấu hình sai, vô hiệu hoá credential cũ. |
| **4. Khôi phục** | Đưa về hoạt động bình thường: bật lại tính năng, gỡ Under Attack, khôi phục dữ liệu từ Neon PITR nếu cần. Theo dõi sát 24–48h. |
| **5. Hậu kiểm** | Họp ngắn (kể cả 1 người): chuyện gì xảy ra, vì sao, đã sửa gì, làm gì để không tái diễn. Cập nhật sổ tay này. Thông báo khách nếu có rò dữ liệu (xem KB-2). |

---

## 2. Kịch bản cụ thể

### KB-1 — Lộ secret / API key (commit nhầm, lộ trong log, gửi nhầm…)

**Dấu hiệu:** GitHub secret-scan / gitleaks báo, thấy key trong commit/log/ảnh chụp, hoặc bị bên thứ ba báo.

**Cô lập + Khắc phục — ROTATE ngay theo key nào bị lộ:**

> Nguyên tắc: **rotate ở nhà cung cấp TRƯỚC → cập nhật Vercel env → redeploy.** Key cũ phải chết.

| Secret (env) | Rotate ở đâu | Lưu ý |
|---|---|---|
| `DATABASE_URL` / `DIRECT_URL` | **Neon** → Project → Roles → Reset password (hoặc tạo role mới) | Lấy connection string mới (pooled cho `DATABASE_URL`, direct cho `DIRECT_URL`) |
| R2 (`CLOUDFLARE_ACCOUNT_ID` + access key/secret) | **Cloudflare** → R2 → Manage API Tokens → Roll/Revoke token, tạo token mới | Account ID không bí mật; thứ phải rotate là **R2 Access Key / Secret** |
| `AUTH_GOOGLE_SECRET` / `GOOGLE_CLIENT_SECRET` | **Google Cloud Console** → APIs & Services → Credentials → OAuth client → Reset secret | Client ID giữ nguyên; chỉ reset **secret** |
| `UPSTASH_REDIS_REST_TOKEN` | **Upstash** → Database → Rotate token (Details/REST API) | URL có thể giữ; token phải đổi |
| `NEXTAUTH_SECRET` / `AUTH_SECRET` | Tự sinh chuỗi mới: `openssl rand -base64 32` | ⚠️ **Đổi cái này = ĐĂNG XUẤT TOÀN BỘ USER** (mọi JWT cũ mất hiệu lực). Chỉ làm khi cần. Báo trước nếu được. |
| `CRON_SECRET` | Tự sinh: `openssl rand -hex 32` | Phải cập nhật ở **cả Vercel env và cron-job.org** (header Authorization) nếu không cron sẽ 401 |
| `ENCRYPTION_KEY` | ⚠️ **CỰC KỲ THẬN TRỌNG** | Dùng mã hoá dữ liệu nhạy cảm (CCCD/ngân hàng CTV). Đổi key = **dữ liệu cũ giải mã không ra**. KHÔNG tự đổi — cần re-encrypt dữ liệu trước. Hỏi trước khi động. |
| `ANTHROPIC_API_KEY`, `EXA_API_KEY`, `GOOGLE_SEARCH_API_KEY`, `CRAWLER_TOKEN` | Console tương ứng (Anthropic/Exa/Google/nội bộ) | Chỉ là tool nội bộ; rotate đơn giản, không ảnh hưởng khách |

**Cập nhật env trên Vercel sau khi rotate:**
```
# Vercel Dashboard → Project → Settings → Environment Variables → sửa giá trị → Save
# rồi redeploy:
vercel --prod            # hoặc bấm Redeploy ở Deployments
```
- Cập nhật **cả `.env.local` ở máy** cho khớp.
- **Xoá key cũ khỏi git lịch sử** nếu đã commit (`git filter-repo` / BFG) — nhưng coi key đã lộ là **chết vĩnh viễn**, rotate vẫn là việc chính.

**Khôi phục:** kiểm tra site chạy bình thường sau redeploy (đăng nhập, ảnh R2 load, cron chạy, thanh toán test).

---

### KB-2 — Nghi rò rỉ dữ liệu khách

**Dấu hiệu:** truy vấn DB lạ, export bất thường, dữ liệu khách xuất hiện ở nơi không nên có, bên ngoài báo.

**Cô lập:**
1. Xác định phạm vi: bảng/đơn hàng/khách nào? Cột nhạy cảm (email, SĐT, địa chỉ, CCCD/ngân hàng CTV đã mã hoá `ENCRYPTION_KEY`)?
2. Nếu rò qua credential bị lộ → làm **KB-1** (rotate `DATABASE_URL` ngay).
3. Nếu nghi qua tài khoản admin → làm **KB-3**.
4. Nếu nghi qua lỗ hổng API → tạm tắt endpoint/tính năng dính lỗi (feature flag hoặc revert deploy).

**Khắc phục:** vá lỗ hổng, soát log Neon/Vercel xem ai truy cập gì, lúc nào. Đối chiếu IP với danh sách quản trị hợp lệ.

**Khôi phục + nghĩa vụ:**
- Nếu xác nhận dữ liệu cá nhân khách bị rò: theo **Nghị định 13/2023/NĐ-CP (PDPD)**, có nghĩa vụ thông báo. Soạn thông báo trung thực cho khách bị ảnh hưởng (chuyện gì, dữ liệu nào, khách nên làm gì — vd đổi mật khẩu).
- Lưu hồ sơ điều tra đầy đủ.

> Ghi nhận: SQL injection đã chặn (Prisma parameterized); lỗi 500 không lộ message Prisma; security headers đầy đủ. Rủi ro rò dữ liệu chủ yếu đến từ **credential bị lộ** hoặc **tài khoản admin bị chiếm** → ưu tiên KB-1/KB-3.

---

### KB-3 — Tài khoản admin bị chiếm

**Dấu hiệu:** đăng nhập từ thiết bị/IP lạ, đổi dữ liệu admin bất thường, mật khẩu bị đổi mà không phải mình.

**Cô lập (làm nhanh, theo thứ tự):**

1. **Khoá tài khoản (suspend):** đặt `status` ≠ ACTIVE để chặn đăng nhập (middleware/auth chặn user không active).
2. **Đổi mật khẩu** tài khoản đó về chuỗi mới mạnh (hash bcrypt — đổi qua chức năng admin đổi pass đã có, hoặc cập nhật DB).
3. **Bump `sessionVersion`** để **vô hiệu hoá mọi phiên đăng nhập cũ** của user đó ngay lập tức (auth.ts so `token.sessionVersion` với DB; lệch → buộc đăng xuất). Cột DB: `users.session_version`.

```sql
-- Chạy trên Neon SQL Editor. THAY user_id đúng.
-- Khoá + bắt mọi phiên cũ logout ngay:
UPDATE users
SET status = 'SUSPENDED',
    session_version = session_version + 1
WHERE id = '<USER_ID>';

-- Soát các tài khoản quyền cao để chắc không có cái lạ:
SELECT id, email, role, status, session_version, "updated_at"
FROM users
WHERE role IN ('ADMIN', 'SUPER_ADMIN', 'EDITOR')
ORDER BY "updated_at" DESC;
```

**Khắc phục:**
- Soát audit log / Vercel log: kẻ chiếm đã làm gì? Đổi giá? Tạo user mới? Export? → hoàn tác từng cái.
- Nếu nghi mật khẩu admin lộ trên diện rộng → bump `session_version` cho **tất cả** tài khoản quyền cao và buộc đổi mật khẩu.
- Nếu nghi qua `NEXTAUTH_SECRET`/`AUTH_SECRET` bị lộ (giả mạo JWT) → rotate secret đó (KB-1) — **đăng xuất toàn bộ user**.

**Khôi phục:** sau khi sạch, mở lại `status = 'ACTIVE'` cho chủ tài khoản với mật khẩu mới.

**Hậu kiểm:** ⚠️ **Admin MFA (2FA) hiện CHƯA có (pending).** Đây là biện pháp phòng số 1 cho kịch bản này — ưu tiên triển khai sớm.

---

### KB-4 — DDoS / abuse / bot cào (site chậm, sập, hoá đơn Vercel/Neon tăng vọt)

**Dấu hiệu:** traffic tăng đột biến, site chậm/timeout, Vercel usage/Neon compute tăng bất thường, nhiều request từ ít IP.

**Cô lập — Cloudflare là tuyến đầu (đã đứng trước site):**

1. **Bật "Under Attack Mode"** ngay:
   - Cloudflare → chọn domain `japanvip.vn` → **Security → Settings → Security Level → I'm Under Attack** (hoặc toggle Under Attack ở Overview).
   - Mọi khách sẽ qua trang thử thách JS 5s → lọc bot ngay.
2. **WAF rule chặn nguồn tấn công:**
   - Cloudflare → **Security → WAF → Create rule**: chặn theo IP / ASN / quốc gia / User-Agent đang spam. Action: **Block** hoặc **Managed Challenge**.
   - Bật **Rate Limiting rule** ở Cloudflare cho path bị nhắm (vd `/api/*`, form đặt hàng).
3. App đã có **rate-limit Upstash Redis** cho OTP/upload — kiểm tra còn hoạt động (Upstash dashboard xem request).

**Khắc phục:** giữ Under Attack đến khi traffic về bình thường. Tinh chỉnh WAF để không chặn nhầm khách thật. Bật **Bot Fight Mode** (Cloudflare → Security → Bots).

**Khôi phục:** hạ Security Level về **High/Medium**, tắt Under Attack. Theo dõi 24h. Xem lại hoá đơn Vercel/Neon.

> ⚠️ Pending: Cloudflare **WAF managed rules / Turnstile / Bot / bảo vệ origin-IP** chưa bật sẵn. Nên cấu hình trước để lần sau chỉ cần một cú bật. **Bảo vệ origin (Vercel) bằng cách chỉ cho Cloudflare gọi** là việc nên làm sớm.

---

### KB-5 — Thanh toán gian lận / webhook giả (VNPay)

**Dấu hiệu:** đơn báo "đã thanh toán" nhưng tiền không về tài khoản; webhook đến từ nguồn lạ; số tiền/đơn không khớp.

**Đã có phòng vệ (xác nhận đang chạy):** webhook VNPay **kiểm chữ ký `vnp_SecureHash` (HMAC-SHA512) + so sánh `timingSafeEqual`** và **lấy số tiền từ DB**, không tin số tiền client gửi (`vnpay.ts`). → webhook giả/sửa số tiền sẽ **fail chữ ký** và bị từ chối.

**Cô lập:**
1. **Đối soát ngay** đơn nghi ngờ với **cổng VNPay merchant portal** (trạng thái giao dịch thật) và **sao kê ngân hàng**. Tin VNPay portal + ngân hàng, KHÔNG tin trạng thái đơn trên site.
2. Đơn chưa giao mà nghi gian lận → **tạm giữ giao hàng**.
3. Nếu nghi `vnp_HashSecret` (khoá ký VNPay) bị lộ → **liên hệ VNPay đổi khoá ngay** + cập nhật env tương ứng → redeploy.

**Khắc phục:** soát log webhook (request đến, kết quả verify pass/fail). Nhiều request fail chữ ký từ một nguồn → chặn IP đó ở Cloudflare (KB-4). Vá nếu phát hiện kẽ hở logic đối soát.

**Khôi phục:** chỉ ghi nhận đơn "đã thanh toán" khi **đã đối soát khớp với VNPay + ngân hàng**. Hoàn tiền/huỷ đơn gian lận theo quy trình.

---

## 3. Danh bạ nhà cung cấp (điền số tài khoản/contact thật vào đây)

| Dịch vụ | Việc khi sự cố | Kênh hỗ trợ |
|---|---|---|
| **Vercel** (hosting/deploy/env) | Rollback deploy, sửa env, xem log/usage | vercel.com/help · Dashboard → Support · Status: vercel-status.com |
| **Neon** (PostgreSQL) | Reset role/password, **PITR khôi phục dữ liệu**, xem compute | neon.tech (Console → Support) · Status: neonstatus.com |
| **Cloudflare** (CDN/DNS/WAF) | Under Attack, WAF, chặn IP, bảo vệ origin | dash.cloudflare.com → Support · Status: cloudflarestatus.com |
| **Cloudflare R2** (ảnh) | Roll/revoke API token | Trong dash Cloudflare → R2 |
| **Upstash** (Redis rate-limit) | Rotate token, xem request | upstash.com (Console) |
| **Google Cloud** (OAuth login) | Reset OAuth client secret | console.cloud.google.com → Credentials |
| **VNPay** (thanh toán) | Đổi HashSecret, đối soát giao dịch | Hotline/email merchant VNPay (điền) · Portal merchant |
| **GitHub** (mã nguồn) | Revoke token, xem secret-scan/gitleaks alert | github.com repo → Security |
| **cron-job.org** (chạy cron) | Cập nhật `CRON_SECRET` header | cron-job.org dashboard |

**Người xử lý nội bộ:** Nguyễn Thị Giang — admin@japanvip.vn · Hotline 09.2729.8888

---

## 4. Lệnh / thao tác hay dùng (cheat-sheet)

```bash
# Sinh secret mới
openssl rand -base64 32      # cho NEXTAUTH_SECRET / AUTH_SECRET
openssl rand -hex 32         # cho CRON_SECRET

# Redeploy production sau khi đổi env
vercel --prod                # hoặc Vercel Dashboard → Deployments → Redeploy

# Rollback nhanh về bản chạy tốt
# Vercel Dashboard → Deployments → chọn bản cũ → "Promote to Production"
```

**Neon PITR (khôi phục dữ liệu về thời điểm trước sự cố):**
Neon Console → Project → **Branches** → tạo branch từ **point-in-time** (chọn mốc giờ trước khi bị phá) → kiểm tra dữ liệu trên branch → nếu đúng, trỏ ứng dụng sang / khôi phục. **Tạo branch trước, kiểm tra rồi mới chuyển — không ghi đè vội.**

---

## 5. Sau sự cố — checklist hậu kiểm

- [ ] Đã rotate hết credential liên quan? (KB-1)
- [ ] Đã vá nguyên nhân gốc và deploy?
- [ ] Đã soát log xác định phạm vi thiệt hại?
- [ ] Đã thông báo khách nếu có rò dữ liệu cá nhân? (KB-2 / NĐ 13)
- [ ] Đã đối soát thanh toán nếu liên quan tiền? (KB-5)
- [ ] Đã ghi lại dòng thời gian sự cố (timeline)?
- [ ] Đã cập nhật sổ tay này nếu phát hiện thiếu sót?
- [ ] Hành động phòng ngừa còn nợ: **Admin MFA**, **Cloudflare WAF/Turnstile/bảo vệ origin**, **Sentry + uptime monitoring**, **staging tách prod**, **rotate secret định kỳ**.

---

### Trạng thái phòng vệ hiện tại (tham chiếu nhanh)

**Đã vá:** XSS (sanitize-html), OTP (rate-limit + single-use + crypto.randomInt), SSRF image-proxy (chặn IP nội bộ/metadata + cap 15MB), security headers đầy đủ (HSTS/CSP/X-Frame DENY/nosniff/Referrer/Permissions/COOP/CORP/frame-ancestors none), ẩn lỗi 500, cron secret timingSafeEqual, open-redirect login, upload (magic-byte + UUID + R2 + rate-limit), VNPay webhook ký + timingSafe + amount từ DB, SQL parameterized (Prisma), RBAC server-side + middleware, bcrypt, CVE deps (undici/nodemailer/postcss) override, Dependabot + CI (typecheck/lint/audit/gitleaks).

**Pending (cần chủ DN / hạ tầng):** Admin MFA (2FA); SSRF các scraper khác (parse-url/scrape-*/blog-scraper — vùng khoá, cần mở khoá mới vá); Cloudflare WAF/Turnstile/bot/bảo vệ origin-IP; Sentry + uptime monitoring; staging tách prod; CSP còn `unsafe-inline` (GA4/Meta Pixel — nên chuyển nonce); `xlsx` có CVE nhưng **không có bản vá npm** (giảm rủi ro: chỉ parse file admin tin cậy, cân nhắc đổi sang `exceljs`); rotate secret định kỳ; malware-scan cho upload.
