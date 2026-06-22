# CLAUDE.md — japanvip-2.0

> Kế thừa toàn bộ chỉ dẫn ở `../CLAUDE.md` (thông tin công ty, tech stack, quy tắc code, ngôn ngữ tiếng Việt).

---

## 🔒 LOCKED — VÙNG CODE ĐÃ CHỐT, KHÔNG ĐƯỢC TỰ Ý SỬA/XOÁ

**Các phần dưới đây đã được chủ dự án (Nguyễn Thị Giang) duyệt và khoá (2026-06).**
**TUYỆT ĐỐI KHÔNG sửa, refactor, đổi tên, hay xoá nếu CHƯA được chủ dự án yêu cầu rõ ràng trong phiên hiện tại.** Nếu cần đổi, phải HỎI và chờ chủ dự án đồng ý trước.

### AI Content Writer — tab "Trang Nhật" (luồng scrape Amazon → tạo nội dung → publish)

| Quy tắc đã khoá | File / Hàm |
|---|---|
| Dịch tên VN `[Loại cốt lõi][Hãng][Model][Tính năng phụ][Thông số]` (vd "Máy lọc không khí Daikin MCK556A-T tạo ẩm 41m²"), bỏ tiếng Nhật/chữ thừa | `apps/web/src/app/api/v1/admin/ai/generate-content/route.ts` → `buildProductNamePrompt`, type `product_name` |
| Chèn ảnh đã chọn vào mô tả theo ngữ cảnh, đúng URL | cùng file → `buildImageBlock` |
| Ép toàn bài tiếng Việt (dịch nhãn thông số Nhật→Việt) | cùng file → `VI_ONLY_RULE` |
| KHÔNG ghi placeholder máy móc ("Đang cập nhật", "Cần Japan VIP xác nhận") — thiếu thì bỏ dòng | cùng file → `NO_PLACEHOLDER_RULE` |
| Tự dịch tên khi tạo nội dung + nút ✨ + mô tả dùng tên Việt | `apps/web/src/app/admin/content/ai-writer/ai-writer-client.tsx` → `translateName`, `generate`, `streamOne` |
| Khối PHẢI trên trang sản phẩm ([quick]/[promo]/[warranty]) = **admin tự thêm**, AI KHÔNG điền | `apps/web/src/app/api/v1/admin/ai/publish-japan/route.ts` (mục lưu attributes) |
| Quy đổi giá ¥→VNĐ theo tỷ giá DB → `salePrice` | cùng file (mục tính `salePrice`) |
| Map ảnh nguồn → R2 trong mô tả lúc publish | cùng file (mục `finalDescription`) |
| Chuẩn hoá ảnh khi tải về R2 (fit inside, giữ tỉ lệ, không phóng to/méo/cắt) — dùng `sharp`: ảnh NGANG (tỉ lệ ≥1.3 = ảnh nội dung/banner) ≤ **1200×650**; ảnh vuông/đứng (ảnh sản phẩm) ≤ **850×850** | `publish-japan/route.ts` → `downloadAndUploadImage` |
| Scraper lấy giá đúng biến thể + bắt công suất/điện áp (`table.a-keyvalue`/`.prodDetTable`) | `apps/web/src/app/api/v1/admin/ai/scrape-japan/route.ts` |
| Scraper kakaku.com: chỉ lấy ảnh sản phẩm chính thức `/productimage/fullscale/{ID}.jpg` (nền trắng sạch), nâng size m/s/l→fullscale, ưu tiên itemId đang xem, loại rác shopicon/logo/btn | cùng file → `scrapeKakaku` |
| Lấy ảnh giới thiệu tính năng từ TRANG CHÍNH HÃNG (site render JS) bằng Playwright + Chrome local; lọc ảnh ≥300×200, bỏ logo/icon/nav. CHỈ chạy local (Vercel không có Chrome → 503). Kèm ô dán URL ảnh thủ công | `apps/web/src/app/api/v1/admin/ai/scrape-feature-images/route.ts` + UI `ai-writer-client.tsx` (`scrapeFeatureImages`, `addPastedImages`) |
| Tư liệu tham khảo trang VN: lấy nội dung + bảng thông số + **ảnh ngữ cảnh** (dedup biến thể size WordPress, lọc rác URL; logo in chìm KHÔNG nhận diện được → admin tự chọn ảnh sạch) tiếng Việt (trang VN viết kỹ hơn trang Nhật), nạp nội dung+thông số vào prompt AI (Claude Code + API), ảnh vào kho chọn. AI ưu tiên dữ liệu gốc Nhật khi mâu thuẫn. Admin dán URL thủ công (auto-search gated chờ Google CSE) | `apps/web/src/app/api/v1/admin/ai/scrape-vn-reference/route.ts` + `generate-content/route.ts` → `buildVnReferenceBlock` + UI `scrapeVnReference` |

**Lưu ý vận hành:** AI Writer dùng provider **Claude Code Opus 4.8 (miễn phí)** — chỉ chạy LOCAL (Vercel không có CLI). Không dùng Anthropic API (mất phí).

### Blog (AI Content Writer → loại "Bài viết Blog") — đã chốt 2026-06

| Quy tắc đã khoá | File / Vị trí |
|---|---|
| Nút "Lưu vào Blog" riêng (KHÔNG nhồi vào sản phẩm); nút Lưu nháp SP chỉ ở tab description/faq/attributes/seo | `apps/web/src/app/admin/content/ai-writer/ai-writer-client.tsx` → `saveBlog`, vùng toolbar |
| Excerpt = 2 đoạn <p> đầu, ~320 ký tự | cùng file → `extractBlogExcerpt` |
| Chèn ảnh vào nội dung blog (buildImageBlock) | `generate-content/route.ts` case `blog` |
| Văn phong học từ kho đối thủ (tiêu đề "Đánh giá/So sánh/Có nên mua", KHÔNG "[Model] là gì?", cấu trúc Thiết kế→...→Phù hợp với ai) | `generate-content/route.ts` case `blog` |
| Tải ảnh blog (cả HTML `<img>`) về R2 + UA browser + Referer | `apps/web/src/lib/blog-scraper.ts` → `mirrorContentImages`, `mirrorImageToR2` |
| Render blog: CSS bảng/figure, bỏ `<h1>` trùng, gộp `<br>`, whitelist block (table/figure/p/div), bỏ ảnh hero, thumbnail 144×112 | `apps/web/src/app/(public)/blog/[slug]/page.tsx` + `app/(public)/blog/page.tsx` |
| Blog API: authorId default = session user | `apps/web/src/app/api/v1/admin/content/blog/route.ts` |

### Mua Hộ (BFJ) — Amazon JP (parse URL → tên/giá/biến thể) — đã chốt 2026-06

| Quy tắc đã khoá | File / Vị trí |
|---|---|
| Lấy TÊN: `#productTitle` → fallback thẻ `<title>` (bỏ "Amazon.co.jp:") khi trang rút gọn | `apps/web/src/modules/bfj/url-parser/amazon-jp.parser.ts` (mục Product name) |
| Lấy GIÁ: JSON-LD → buybox DOM → **quét `.a-offscreen`** khi buybox ẩn ("cannot ship"); nhiều biến thể → `priceOptionsJpy` (khoảng giá tham khảo, KHÔNG auto lấy min) | cùng file (mục Price) |
| Brand: **KHÔNG để 'Amazon' trong danh sách brand** (Amazon là sàn) → ra đúng hãng (Philips...) | `apps/web/src/modules/bfj/services/translate.service.ts` (mảng BRAND_PATTERNS) |
| Lọc spec rác: strip `<script>/<style>` trong cell; bỏ value dính code JS, >300 ký tự, nhãn review/ranking | `amazon-jp.parser.ts` (mục Specifications, `isJunkSpec`) |
| Biến thể màu: lấy ảnh+tên từ swatch + **ASIN từ twister JSON** → `colorVariants` (name, image, url). UI bấm ô màu → re-parse đúng biến thể | `amazon-jp.parser.ts` (`colorVariants`) + UI `bfj-url-form.tsx` (gallery bấm được + `handleParse(url)`) |
| Dịch thông số + tên màu JP→VI (google-free), giữ brand/model/số; cleanup token "§§"/"củ A" | `translate.service.ts` → `translateSpecs` + `parse-url/route.ts` |
| **Giá Amazon ẩn/lazy-load**: buybox ẩn → `unitPriceJpy=null`. Nếu có dải giá `.a-offscreen` (`priceOptionsJpy`) → **tự điền giá "từ" (thấp nhất) vào ô giá thủ công** (editable, có nhãn "✅ Tự lấy giá từ ¥X, sửa nếu chọn biến thể đắt hơn"); KHÔNG auto tính ngầm — khách bấm Tính phí mới chốt. Không có dải giá → để trống, nhập tay. Parser KHÔNG tự set unitPriceJpy=min (giữ luật cũ); việc điền "từ" chỉ ở UI. Khách bấm màu = chọn đúng biến thể, mua đúng link đã dán | `bfj-url-form.tsx` (`handleParse` pre-fill) + luồng tổng |
| Cache kết quả parse vào Redis theo ASIN (`bfj:parse:asin:{ASIN}`, TTL 24h), bỏ `rawHtml` trước khi cache; lần sau khỏi load lại (5.8s→0.37s). Có cờ `refresh:true` + nút "🔄 Tải lại mới" để bỏ cache | `parse-url/route.ts` (`parseCacheKey`, `getCached/setCached`) + UI `bfj-url-form.tsx` (`handleParse(url, refresh)`) |
| Tự lấy cân nặng: `parseWeightKg` nhận nhãn JP/EN (重量/重さ/質量/item weight…), đơn vị JP (キログラム/グラム/ポンド) + latin, ưu tiên cân SP hơn cân kiện hàng (梱包/パッケージ), fallback quét rawHtml. Pre-fill ô kg | `amazon-jp.parser.ts` (`parseWeightKg`, `weightFromValue`) |
| Ẩn bảng "Bảng Phí Dịch Vụ" tĩnh — chỉ hiện bảng BÁO GIÁ sau khi tính; thêm ô nhập cân nặng (kg) để tính phí ship JP→VN (~160k/kg theo cân) | `bfj-url-form.tsx` (`manualWeightKg`, `handleManualCalculate`) |

---

## Việc đang chờ (chưa làm)
- **Google tìm ảnh** (search-images route + UI): đã cấu hình xong (project `japanvip-image-search`, billing Japan Vlp, key+CX trong `.env.local`, API enabled). Chờ Google kích hoạt Custom Search cho project mới (403 lúc đầu, tự thông sau vài giờ). KHÔNG cần làm thêm.
- Lấy giá Amazon chuẩn: **Amazon PA-API** (scrape tĩnh không chắc vì giá render JS + sponsored).
- Hỗ trợ amazon.com (US, USD→VNĐ — đụng vùng giá khoá).
- Exa lookup server-side: năm SX + đúng cảm biến từ trang hãng.
- **Auto-tìm trang VN theo model** cho tư liệu VN: hiện admin dán URL thủ công (đã chạy). Phần auto cần Google CSE web search (CX mới "tìm toàn web") — gated chờ CSE kích hoạt giống Google tìm ảnh.
