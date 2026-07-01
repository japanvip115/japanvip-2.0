# PLAN — Tính năng theo dõi & gợi ý giá cạnh tranh (Giá Cạnh Tranh)

> Trạng thái: **DRAFT chờ chủ dự án duyệt** · Ngày: 2026-07-01 · Không code/không migration cho tới khi duyệt.

## 1. Mục tiêu
Giữ giá bán trên japanvip.vn **bám sát giá shopnoidianhat.vn** (nguồn nhập buôn chính), không lệch thị trường quá — đồng thời **không bao giờ bán dưới giá vốn**. Con người duyệt mọi thay đổi (không tự đổi giá).

## 2. Quyết định đã chốt (input chủ dự án)
| # | Quyết định | Giá trị |
|---|---|---|
| 1 | Mốc chính (anchor) | **shopnoidianhat.vn** (nguồn nhập buôn) |
| 2 | 4 trang còn lại (congnghenhat, hangnhat123, hiephongjapan, phongcachnhat) | **Chỉ tham khảo**, hiển thị bối cảnh, KHÔNG tính vào đề xuất |
| 3 | Cách đặt giá | **shopnoidianhat + biên tuyệt đối 500k–900k VNĐ** (KHÔNG phải %). Vì HP↔HN gần, đắt quá khách đặt thẳng HN ship về HP |
| 4 | Cơ chế | **Cảnh báo + gợi ý, người duyệt** (không auto) |
| 5 | Giá vốn | **KHÔNG có list** (làm từ đầu, nhập dần). **Bỏ sàn giá vốn** — biên +500k–900k trên shopnoidianhat đã luôn có lãi (mua buôn ≤ giá shopnoidianhat). `costPrice` để trống, điền sau nếu muốn |
| 6 | Cảnh báo lệch | Cờ đỏ khi giá bạn **ra ngoài dải** [shopnoidianhat+500k, shopnoidianhat+900k] |
| 7 | Cột giá gốc Nhật | **kakaku.com** (quy đổi ¥→VNĐ) → xem **chênh lệch nhập khẩu %** (VN vs Nhật). Chỉ tham khảo, không tính vào đề xuất |

## 3. Hiện trạng (tái sử dụng được)
- Bộ cào 5 đối thủ (Python) — **đã cào shopnoidianhat 443 SP**. Hiện xuất file rời rạc, CHƯA vào DB.
- **Scraper kakaku.com sẵn có** (`apps/web/.../ai/scrape-japan/route.ts` → `scrapeKakaku`, **VÙNG KHOÁ**) — lấy giá ¥ + ảnh chính hãng theo model. Tính năng này **chỉ GỌI lại, không sửa** logic khoá.
- `Product`: `salePrice`, `originPrice`, `marketPrice`, `name` (chứa model number), `brandId`. **Chưa có** trường giá vốn.
- Có sẵn: `AuditLog` (ghi log đổi giá), `SiteSetting` (key/value — lưu config), `ExchangeRate`.
- Admin routes: `apps/web/src/app/admin/*` → thêm trang mới `admin/gia-canh-tranh`.

## 4. Kiến trúc & luồng dữ liệu
```
Scraper (Python, đã có)
   └─> [MỚI] import job: ghi vào bảng CompetitorPrice (upsert theo product+source)
          └─> [MỚI] matching job: khớp SP JapanVip ↔ SP đối thủ theo model number
                 └─> [MỚI] API so giá → Admin UI /admin/gia-canh-tranh
                        └─> admin bấm "Áp dụng" → cập nhật salePrice + ghi AuditLog
```

## 5. Thiết kế DB (2 thay đổi — ĐỀU additive, non-destructive)

**5.1. Thêm trường vào `Product`:**
```prisma
costPrice   Decimal?  @map("cost_price")   @db.Decimal(15, 2)  // giá vốn — TÙY CHỌN, để trống Phase 1 (chưa có list)
```
> Phase 1 KHÔNG dùng sàn giá vốn (chưa có list). Lãi được đảm bảo bằng biên +500k–900k trên shopnoidianhat (mua buôn ≤ giá shopnoidianhat). Trường này để sẵn, điền sau khi có số liệu.

**5.2. Bảng mới `CompetitorPrice`** (một dòng = 1 quan sát giá của 1 đối thủ cho 1 SP):
```prisma
model CompetitorPrice {
  id              String   @id @default(uuid()) @db.Uuid
  productId       String   @map("product_id") @db.Uuid
  source          String   @db.VarChar(50)      // 'shopnoidianhat' | 'congnghenhat' | ... | 'kakaku'
  market          String   @default("vn") @db.VarChar(2)   // 'vn' = đối thủ VN | 'jp' = kakaku (giá Nhật)
  isPrimary       Boolean  @default(false)       // true CHỈ cho shopnoidianhat (anchor)
  competitorUrl   String?  @map("competitor_url") @db.Text
  competitorName  String?  @map("competitor_name") @db.VarChar(500)
  priceVnd        Decimal? @map("price_vnd") @db.Decimal(15, 2)   // giá đã quy đổi VNĐ (kakaku: ¥×tỷ giá)
  priceJpy        Decimal? @map("price_jpy") @db.Decimal(15, 2)   // giá yên gốc — CHỈ nguồn kakaku
  matchModel      String?  @map("match_model") @db.VarChar(100)   // model number khớp
  matchStatus     String   @default("auto") @map("match_status")  // 'auto'|'confirmed'|'rejected'
  scrapedAt       DateTime @map("scraped_at") @db.Timestamptz
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz
  product         Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId, source])
  @@index([scrapedAt])
  @@map("competitor_prices")
}
```
- Giữ lịch sử quan sát (append) → phục vụ biểu đồ xu hướng ở Phase 2. Dashboard query **bản mới nhất** theo (product, source). Retention: dọn bản > 90 ngày (job định kỳ).
- `Product` thêm quan hệ ngược `competitorPrices CompetitorPrice[]`.

**5.3. Config trong `SiteSetting`** (key/value có sẵn, không cần bảng mới):
- `pricing_anchor_source` = `shopnoidianhat`
- `pricing_markup_min_vnd` = `500000` — biên tối thiểu cộng trên shopnoidianhat
- `pricing_markup_max_vnd` = `900000` — biên tối đa
- `pricing_markup_default_vnd` = `700000` — biên mặc định để sinh giá đề xuất (làm tròn đẹp trong dải)
- `pricing_round_to_vnd` = `10000` — làm tròn giá đề xuất tới bội số này cho đẹp
- `pricing_stale_days` = `14` (bỏ qua giá cào cũ hơn)

## 6. Logic khớp cặp (matching) — phần lõi
1. Trích **model number** từ `Product.name` bằng regex (chuỗi chữ-số kiểu `R-WXC74X`, `MCK556A-T`, `MR-WXD70M`).
2. Chuẩn hoá: viết HOA, bỏ dấu cách/gạch → `RWXC74X`.
3. Khớp với tên SP đối thủ (đã cào) sau khi chuẩn hoá tương tự.
4. Khớp chắc (model trùng khít) → `matchStatus='auto'`. Mơ hồ/nhiều ứng viên → để admin xác nhận (`confirmed`/`rejected`) trong UI.
5. Ưu tiên khớp **shopnoidianhat trước** (anchor, chủ dự án nhập hàng ở đó nên biết chính xác model).

## 7. Logic gợi ý giá
```
Cho mỗi Product P có match shopnoidianhat mới nhất (chưa stale):
  anchor    = giá shopnoidianhat
  bandLow   = anchor + markup_min_vnd          # +500k
  bandHigh  = anchor + markup_max_vnd          # +900k
  suggested = roundTo( anchor + markup_default_vnd, round_to_vnd )   # +700k, làm tròn 10k
              (kẹp trong [bandLow, bandHigh])
  refMedian = trung vị giá của 4 trang kia (nếu có ≥2 nguồn)

  Cờ cảnh báo:
    🔴 P.salePrice > bandHigh   → "đắt hơn shopnoidianhat >900k — khách dễ đặt thẳng HN, nên giảm"
    🟠 P.salePrice < bandLow    → "cao hơn shopnoidianhat <500k (hoặc thấp hơn) — đang để rẻ, có thể tăng"
    ⚠️ refMedian tồn tại & |anchor − refMedian|/refMedian > 15% → "shopnoidianhat lệch thị trường, xem lại"
    ⚠️ chưa có match shopnoidianhat → "thiếu mốc, cần cào/khớp hoặc nhập giá tay"
```
> KHÔNG có sàn giá vốn ở Phase 1 (chưa có list). Lãi đảm bảo do `suggested ≥ anchor + 500k` mà bạn mua buôn ≤ anchor.

### 7.1. Cột tham chiếu giá gốc Nhật (kakaku) — chênh lệch nhập khẩu
- Lấy giá kakaku (¥) theo model → quy đổi VNĐ qua `ExchangeRate`: `jpVnd = priceJpy × tỷ giá`.
- **Chênh lệch nhập khẩu %** hiển thị cho:
  - `(shopnoidianhat − jpVnd) / jpVnd × 100` → "shopnoidianhat đội giá so với Nhật bao nhiêu %"
  - `(giá bạn − jpVnd) / jpVnd × 100` → biên của chính bạn so với gốc Nhật
- **Lưu ý (ghi rõ trên UI):** kakaku là **giá bán lẻ thấp nhất tại Nhật**, KHÔNG bằng giá vốn nhập thật (chưa gồm ship/thuế/chiết khấu buôn). Cột này **chỉ để tham khảo biên nhập khẩu**, KHÔNG dùng để tính giá đề xuất (giá đề xuất chỉ bám shopnoidianhat + biên). Tỷ giá biến động → hiện tỷ giá + ngày.
- Dùng lại **scraper kakaku sẵn có** (`scrape-japan/route.ts` → `scrapeKakaku`, **vùng khoá — chỉ gọi, không sửa**), khớp theo model number như §6.

## 8. API (Next.js API routes, admin-only)
| Method | Route | Việc |
|---|---|---|
| GET | `/api/v1/admin/pricing/comparison` | Danh sách SP + anchor/reference/suggested/cờ + filter (lệch quá ngưỡng, danh mục, brand) |
| POST | `/api/v1/admin/pricing/apply` | Áp giá cho 1 SP (giá đề xuất hoặc nhập tay) → cập nhật `salePrice` + ghi `AuditLog` |
| POST | `/api/v1/admin/pricing/match` | Xác nhận/loại 1 match (`confirmed`/`rejected`) |
| POST | `/api/v1/admin/pricing/import-cost` | Import giá vốn từ CSV/XLSX (model + giá) |
| POST | `/api/v1/admin/pricing/refresh` | Chạy import từ output scraper → upsert `CompetitorPrice` → re-match (hoặc script CLI) |

## 9. Admin UI — `/admin/gia-canh-tranh`
- Bảng: `SP | Giá bạn | **shopnoidianhat (mốc)** | Chênh so mốc (VNĐ) | **Giá Nhật kakaku (VNĐ)** | **Chênh lệch nhập khẩu %** | 4 trang khác (min/TV/max, số shop) | Giá đề xuất (mốc+700k) | [Áp dụng]`.
- Cột "Chênh so mốc" = `giá bạn − shopnoidianhat`, tô màu: 🟢 trong dải 500–900k / 🟠 dưới 500k / 🔴 trên 900k.
- Cột shopnoidianhat **nổi bật** (mốc); cột **kakaku + chênh lệch nhập khẩu** làm nhóm insight riêng (mờ hơn mốc); 4 cột đối thủ VN mờ (tham khảo). Hiện **ngày cào + tỷ giá** đang dùng cho cột kakaku.
- Lọc: chỉ hiện SP ra ngoài dải / thiếu mốc / theo danh mục / brand. Sắp theo mức chênh.
- Khu **xác nhận match** cho case mơ hồ.
- "Áp dụng" có xác nhận + ghi AuditLog (ai, khi nào, giá cũ→mới).

## 10. Bảo mật & chốt chặn
- Admin-only (role check như các trang admin khác). Validate input (giá > 0, số hợp lệ).
- **Giá đề xuất luôn ≥ shopnoidianhat + 500k** → luôn có lãi (mua buôn ≤ giá shopnoidianhat), không cần sàn vốn.
- Cảnh báo nếu giá đề xuất lệch bất thường (dấu hiệu khớp/cào sai, vd shopnoidianhat rẻ bất thường) — yêu cầu người xác nhận.
- Mọi thay đổi giá → `AuditLog`. Có thể xem lại/hoàn tác thủ công.
- Bỏ qua giá cào **quá cũ** (`pricing_stale_days`).

## 11. Migration (Neon = PRODUCTION — cẩn thận)
- Cả 2 thay đổi **additive** (thêm cột nullable + bảng mới) → an toàn, không mất data.
- Theo quy trình đã chốt: **KHÔNG tự `db push`/migration lên Neon prod khi chưa được duyệt**. Ưu tiên Neon branch flow. Chủ dự án bấm đồng ý mới chạy.

## 12. Test
- Unit (hàm thuần): trích model, chuẩn hoá, tính trung vị tham khảo, sinh giá đề xuất (mốc+biên, làm tròn, kẹp dải), sinh cờ.
- Integration: matching, apply giá + ghi AuditLog, quy đổi kakaku ¥→VNĐ.
- `next build` pass trước khi push.

## 13. Lộ trình
- **Phase 1a:** DB (`CompetitorPrice` + `costPrice` để trống) + nối scraper (shopnoidianhat + 4 trang + kakaku)→DB + matching job.
- **Phase 1b:** Trang admin `/admin/gia-canh-tranh` (xem + cờ dải + gợi ý mốc+biên + áp dụng + xác nhận match).
- **Phase 2 (sau):** biểu đồ xu hướng giá, email cảnh báo khi lệch mạnh, bán-tự-động trong giới hạn, thêm nguồn.

## 14. Cần chủ dự án cung cấp / chốt trước khi code
1. Xác nhận **dải biên 500k–900k**, biên **mặc định 700k**, làm tròn **10k** (chỉnh trong admin sau được).
2. **Nhịp cào lại** giá: hằng ngày / hằng tuần? (đồ gia dụng → tuần thường là đủ.)
3. Vị trí/định dạng output của scraper hiện tại (để nối `refresh` vào DB) — nếu bạn biết đường dẫn thư mục.
> Không cần file giá vốn ở Phase 1 (đã bỏ sàn vốn). `costPrice` để trống, điền sau nếu muốn.

## 15. Ước lượng công sức (thô)
- Phase 1a: ~1–2 ngày. · Phase 1b: ~2–3 ngày. Tái dùng scraper + AuditLog + SiteSetting sẵn có.
