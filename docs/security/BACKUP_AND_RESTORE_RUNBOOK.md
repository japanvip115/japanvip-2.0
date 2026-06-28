# Sổ tay Sao lưu & Khôi phục — Japan VIP (japanvip.vn)

> Dành cho chủ DN tự vận hành. Gọn, hành động được. Khi có sự cố mất/hỏng dữ liệu, mở thẳng phần **[Khôi phục nhanh khi khẩn cấp](#khôi-phục-nhanh-khi-khẩn-cấp)** ở cuối.

## Dữ liệu cần bảo vệ (3 nhóm)

| Nhóm | Lưu ở đâu | Mất thì sao | Công cụ backup |
|---|---|---|---|
| **Database** (đơn hàng, user, sản phẩm, đấu giá, mua hộ, blog…) | PostgreSQL **Neon** | Mất hết nghiệp vụ — nghiêm trọng nhất | Neon PITR + branch + dump định kỳ |
| **Ảnh / media** (ảnh SP, blog, banner, chứng từ khách) | Cloudflare **R2** (`japanvip-media`, media.japanvip.vn) | Website vỡ ảnh, mất chứng từ | R2 versioning + sao lưu định kỳ |
| **Secret / env** (mật khẩu DB, AUTH_SECRET, R2 key, VNPay, SMTP…) | `.env.local` (KHÔNG commit) + Vercel env | Không deploy/vận hành lại được | Trình quản lý mật khẩu (1Password/Bitwarden) |

> Mã nguồn đã nằm trên GitHub → coi như đã được backup. Trọng tâm sổ tay này là **3 nhóm trên**.

---

## 1. Database — Neon PostgreSQL

Neon là DB chính (production). **Lưu ý quan trọng:** `.env.local` của máy dev đang trỏ thẳng vào Neon production — mọi thao tác ghi/migrate đều đụng dữ liệu thật. Cẩn trọng khi chạy script.

### 1.1 PITR (Point-in-Time Restore) — lớp bảo vệ chính

Neon tự động giữ **lịch sử thay đổi (history)** → có thể khôi phục DB về **bất kỳ thời điểm** trong khoảng giữ lịch sử.

| Việc | Hành động |
|---|---|
| **Kiểm tra cửa sổ giữ lịch sử** | Console → Project → **Settings → Storage / History retention**. Xem đang giữ bao nhiêu ngày. |
| **Đề xuất** | Đặt **history retention ≥ 7 ngày** (gói trả phí cho phép tới 30 ngày). DN nhỏ: tối thiểu 7 ngày để có thời gian phát hiện sự cố. |

> Càng giữ dài, càng nhiều dung lượng/chi phí. 7 ngày là cân bằng hợp lý cho quy mô hiện tại.

### 1.2 Khôi phục theo thời điểm bằng cách tạo BRANCH (an toàn nhất)

**Nguyên tắc vàng:** Khi nghi mất/hỏng dữ liệu, **KHÔNG sửa trực tiếp** nhánh production. Tạo một **branch khôi phục** tại thời điểm trước sự cố, kiểm tra dữ liệu trên branch đó, rồi mới quyết định cách đưa về production.

**Cách A — Qua Console (khuyên dùng, ít sai sót):**
1. Console → chọn Project → tab **Branches** → **Create branch**.
2. Đặt tên rõ: `restore-2026-06-28-truoc-su-co`.
3. Mục **Include data up to** → chọn **point in time** (ngày giờ trước khi xảy ra sự cố, theo giờ VN UTC+7 — quy đổi nếu console hiển thị UTC).
4. Tạo xong → branch có connection string riêng. Dùng nó để **kiểm tra dữ liệu** (xem bảng `Order`, `User`… còn đúng không).
5. Nếu dữ liệu đúng → xem mục **1.3** để đưa về production.

**Cách B — Qua `neonctl` (CLI):**
```bash
# Cài 1 lần
npm i -g neonctl
neonctl auth                       # đăng nhập trình duyệt

neonctl projects list              # lấy project id
neonctl branches list --project-id <PROJECT_ID>

# Tạo branch khôi phục tại thời điểm (ISO 8601, kèm offset giờ VN +07:00)
neonctl branches create \
  --project-id <PROJECT_ID> \
  --name restore-2026-06-28 \
  --parent-timestamp 2026-06-28T09:30:00+07:00

# Lấy connection string của branch vừa tạo để kiểm tra
neonctl connection-string restore-2026-06-28 --project-id <PROJECT_ID>
```

### 1.3 Đưa dữ liệu khôi phục về production

Sau khi branch khôi phục đã được xác minh đúng, chọn **một** cách:

- **Cách an toàn (khuyên dùng):** Trong Console, dùng **Restore / "Reset from branch"** hoặc **promote** branch khôi phục thành nhánh chính. Neon tự tạo bản sao lưu (backup branch) của trạng thái hiện tại trước khi ghi đè → vẫn rollback được nếu chọn nhầm.
- **Cách thủ công (khi chỉ mất vài bảng):** `pg_dump` đúng bảng từ branch khôi phục rồi `psql` nạp lại vào production. Chỉ làm khi chắc chắn về phạm vi bảng.

> ⚠️ Sau khi đổi nhánh chính, **connection string có thể đổi** → cập nhật `DATABASE_URL` trong Vercel env + redeploy.

### 1.4 Dump dự phòng định kỳ (lớp 2 — phòng khi mất cả tài khoản Neon)

PITR chỉ cứu khi tài khoản Neon còn sống. Nên có thêm bản dump tải về **ngoài Neon**:
```bash
# Tải toàn bộ DB ra 1 file nén (chạy trên máy chủ DN, có pg_dump >= phiên bản Neon)
pg_dump "$DATABASE_URL_PROD" -Fc -f japanvip_$(date +%Y%m%d).dump

# Khôi phục từ file dump (vào DB rỗng/branch mới)
pg_restore -d "$DATABASE_URL_TARGET" --clean --if-exists japanvip_YYYYMMDD.dump
```
Lưu file `.dump` này lên ổ ngoài / cloud cá nhân (Google Drive…). **Tần suất đề xuất: 1 lần/tuần.**

---

## 2. Ảnh / Media — Cloudflare R2

Bucket `japanvip-media` phục vụ qua `media.japanvip.vn`. Mất ảnh = website vỡ giao diện + **mất chứng từ khách hàng** (ảnh thanh toán/khiếu nại) → có giá trị pháp lý.

### 2.1 Bật Versioning (ưu tiên làm ngay)
- Cloudflare Dashboard → **R2 → bucket `japanvip-media` → Settings → Object Versioning → Enable**.
- Khi bật, mỗi lần ghi đè/xoá object đều giữ phiên bản cũ → **khôi phục được file bị xoá/ghi đè nhầm**.
- Cân nhắc thêm **Lifecycle rule**: tự dọn phiên bản cũ sau 30–60 ngày để khỏi phình dung lượng.

### 2.2 Sao lưu định kỳ ra ngoài R2
Versioning không cứu được khi mất cả tài khoản Cloudflare. Định kỳ đồng bộ bucket về ổ ngoài bằng `rclone` (hỗ trợ R2 qua giao thức S3):
```bash
# Cấu hình 1 lần: rclone config  → loại "S3" → provider "Cloudflare"
#   endpoint: https://<ACCOUNT_ID>.r2.cloudflarestorage.com
#   dùng R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY

# Đồng bộ toàn bộ ảnh về máy (chỉ tải file mới/đổi)
rclone sync r2:japanvip-media /backup/japanvip-media --progress
```
**Tần suất đề xuất: 1 lần/tuần** (hoặc sau đợt upload lớn). Giữ ít nhất 2 bản gần nhất.

### 2.3 Khôi phục ảnh
- **Xoá/ghi đè nhầm vài file** → R2 Console: vào object → chọn phiên bản cũ → restore (nếu đã bật versioning).
- **Mất nhiều/mất bucket** → tạo lại bucket → `rclone sync /backup/japanvip-media r2:japanvip-media` (đẩy ngược từ bản backup).

---

## 3. Secret / Env — Trình quản lý mật khẩu

### 3.1 Quy tắc bắt buộc
- ✅ **`.env.local` KHÔNG bao giờ commit** — đã có trong `.gitignore` (`.env`, `.env.local`, `.env.*.local`). Giữ nguyên.
- ✅ Repo chỉ có **`.env.example`** (mẫu trống, không chứa giá trị thật). Khi thêm biến mới → cập nhật `.env.example` với giá trị placeholder.
- ❌ Không gửi secret qua chat/email/ảnh chụp màn hình.

### 3.2 Lưu secret ở đâu
Lưu **bản gốc duy nhất** của tất cả secret trong **trình quản lý mật khẩu** (1Password hoặc Bitwarden), trong 1 mục riêng "Japan VIP — Production Secrets":

| Nhóm secret | Biến (xem `.env.example`) |
|---|---|
| Database | `DATABASE_URL` (Neon prod) |
| Auth | `AUTH_SECRET` (NextAuth) |
| Cloudflare R2 | `CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` |
| Redis | Upstash REST URL/token |
| Email | `SMTP_HOST/PORT/USER/PASS` |
| Thanh toán | VNPay TMN code / secret |
| Khác | Token Facebook, key AI (Exa…), cron secret |

> **Nguồn chân lý vận hành** là **Vercel → Project → Settings → Environment Variables** (Production). Trình quản lý mật khẩu là **bản sao lưu** của nó. Mỗi khi đổi secret trên Vercel → cập nhật lại vào trình quản lý mật khẩu cùng ngày.

### 3.3 Khôi phục env
- Cài lại máy / mất `.env.local` → copy từ trình quản lý mật khẩu, dán vào `apps/web/.env.local`.
- Deploy lại trên Vercel chỉ cần env trên Vercel còn → không phụ thuộc máy cá nhân.

---

## 4. Lịch backup & Retention đề xuất

| Hạng mục | Tần suất | Giữ bao lâu | Cách |
|---|---|---|---|
| Neon PITR (history) | Tự động liên tục | **≥ 7 ngày** | Bật sẵn trong Settings |
| Neon dump `.dump` ra ngoài | **Hàng tuần** | Giữ 4 bản gần nhất (~1 tháng) | `pg_dump` → ổ ngoài/Drive |
| R2 versioning | Tự động mỗi lần ghi | 30–60 ngày (lifecycle) | Bật trong bucket Settings |
| R2 sync `rclone` ra ngoài | **Hàng tuần** | Giữ 2 bản gần nhất | `rclone sync` |
| Secret → trình quản lý mật khẩu | **Mỗi khi thay đổi** | Luôn giữ bản mới nhất | Cập nhật thủ công |
| **Diễn tập restore (drill)** | **Hàng quý (3 tháng/lần)** | Ghi lại kết quả | Xem mục 5 |

> Đặt nhắc lịch (Google Calendar) cho 2 việc tuần (dump DB + sync R2) và 1 việc quý (diễn tập restore).

---

## 5. Diễn tập khôi phục (Restore Drill) — quan trọng

Backup chỉ có giá trị khi **đã thử khôi phục thành công ít nhất 1 lần**. Mỗi quý làm 1 lần, **trên branch — KHÔNG đụng production**:

1. Tạo branch Neon khôi phục tại thời điểm hôm qua (mục 1.2).
2. Lấy connection string của branch → mở bằng công cụ DB (TablePlus/psql).
3. Kiểm tra vài bảng trọng yếu: `Order`, `User`, `Product`, `Auction`. Đếm số dòng có hợp lý không.
4. Thử restore 1 file ảnh bất kỳ từ bản `rclone` về thư mục tạm → mở xem ảnh có mở được không.
5. Mở trình quản lý mật khẩu → xác nhận `DATABASE_URL`, `AUTH_SECRET`, R2 key còn đọc được.
6. **Xoá branch khôi phục** sau khi diễn tập xong (tránh tốn dung lượng).
7. Ghi lại: ngày diễn tập, mất bao lâu, có lỗi gì → lần sau nhanh hơn.

---

## 6. Checklist kiểm tra SAU KHI khôi phục (production)

Sau bất kỳ lần khôi phục thật vào production, kiểm đủ các mục sau trước khi coi là xong:

- [ ] Web `japanvip.vn` mở được, trang chủ + ảnh hiển thị bình thường.
- [ ] Đăng nhập admin OK (chứng tỏ `AUTH_SECRET` + DB user khớp).
- [ ] Vào `/admin` xem **đơn hàng / mua hộ / đấu giá** mới nhất — đúng tới thời điểm khôi phục, không thiếu.
- [ ] Ảnh sản phẩm + ảnh blog từ `media.japanvip.vn` load được (R2 OK).
- [ ] Tạo thử 1 thao tác ghi nhỏ (sửa 1 SP nháp) → lưu được → DB ghi OK.
- [ ] Thử 1 luồng thanh toán test (nếu cần) → VNPay callback ghi đúng.
- [ ] Kiểm `DATABASE_URL` trên Vercel khớp nhánh chính mới (nếu đã đổi/promote branch) → đã redeploy.
- [ ] Email hệ thống (OTP/đơn hàng) gửi được — thử 1 lần.
- [ ] So số liệu: đếm số đơn / số user trước và sau, chênh lệch đúng như kỳ vọng.
- [ ] Thông báo nội bộ: đã khôi phục về thời điểm nào, dữ liệu trong khoảng nào có thể bị mất.

---

## Khôi phục nhanh khi khẩn cấp

> Khi phát hiện mất/hỏng dữ liệu — làm theo thứ tự, **đừng hoảng, đừng ghi đè production vội**.

1. **DỪNG ghi thêm:** tạm khoá thao tác đang gây hỏng (tắt script/cron nghi vấn). Đừng "sửa tay" lên production.
2. **Xác định thời điểm sự cố:** giờ phút (VN, UTC+7) trước khi dữ liệu hỏng.
3. **DB:** Neon Console → Branches → Create branch → **point in time** trước sự cố (mục 1.2 Cách A). Kiểm dữ liệu trên branch.
4. Dữ liệu trên branch đúng → **promote/restore** về production (mục 1.3) → cập nhật `DATABASE_URL` ở Vercel nếu đổi → redeploy.
5. **Ảnh:** nếu mất ảnh → restore phiên bản trong R2 (versioning) hoặc `rclone sync` từ bản backup (mục 2.3).
6. **Chạy đủ [Checklist mục 6](#6-checklist-kiểm-tra-sau-khi-khôi-phục-production).**

### Liên hệ / tài khoản cần khi khẩn cấp
- **Neon:** console.neon.tech (đăng nhập tài khoản DN)
- **Cloudflare:** dash.cloudflare.com → R2
- **Vercel:** vercel.com (env + redeploy)
- **Trình quản lý mật khẩu:** nơi giữ toàn bộ secret gốc

---

### Trạng thái hiện tại
| Hạng mục | Trạng thái |
|---|---|
| `.env.local` không commit + có `.env.example` | ✅ Đã làm (trong `.gitignore`) |
| Neon PITR (mặc định có history) | ✅ Có sẵn — **cần kiểm/đặt retention ≥ 7 ngày** |
| Neon dump định kỳ ra ngoài | ⏳ Pending — cần đặt lịch tuần |
| R2 versioning | ⏳ Pending — bật trong bucket Settings |
| R2 sync ra ngoài (rclone) | ⏳ Pending — cần cấu hình + lịch tuần |
| Secret → trình quản lý mật khẩu | ⏳ Pending — gom secret vào 1Password/Bitwarden |
| Diễn tập restore hàng quý | ⏳ Pending — đặt lịch quý đầu |
