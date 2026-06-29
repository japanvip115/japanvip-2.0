# CLAUDE.md — japanvip-2.0

> Kế thừa toàn bộ chỉ dẫn ở `../CLAUDE.md` (thông tin công ty, tech stack, quy tắc code, ngôn ngữ tiếng Việt).

---

## ⚡ Nguyên tắc cộng tác với Claude (BẮT BUỘC — đọc trước MỌI task)

> 5 luật nền. Tuân thủ trước khi làm bất cứ việc gì. Khi mâu thuẫn với phần khác trong tài liệu, ưu tiên 4 luật này.

### §1 — THINK BEFORE CODING (Hỏi trước, đừng đoán, đừng giấu chỗ rối)

- ❌ Tự đoán ý rồi chạy luôn — báo "xong rồi" mà thật ra chưa làm.
- ❌ Gặp chỗ mơ hồ thì im lặng tự chọn một cách hiểu.
- ✅ Nói rõ giả định. Không chắc → **dừng lại hỏi**.
- ✅ Có nhiều cách hiểu → trình bày hết, không tự quyết một mình.
- 💡 Lỗi phổ biến nhất của agent: đoán sai ý rồi chạy theo mà không kiểm tra lại, không hỏi cho rõ, không nêu mâu thuẫn.

### §2 — SIMPLICITY FIRST (Viết tối thiểu, không gì thừa)

- ❌ Viết 1.000 dòng cho thứ chỉ cần 100 — bloated, brittle.
- ❌ Tự thêm "linh hoạt", abstraction, xử lý lỗi không được yêu cầu.
- ✅ Chỉ làm **đúng thứ được hỏi**. Không gì mang tính phỏng đoán.
- ✅ 200 dòng mà rút được còn 50 → **viết lại cho gọn**.
- 💡 Model train trên codebase production nên mặc định viết kiểu lớn, phức tạp. Phải chủ động ép đơn giản — nó không tự làm.

### §3 — SURGICAL CHANGES (Sửa đúng chỗ, không lan ra)

- ❌ "Cải thiện" luôn code, comment, format ở chỗ lân cận.
- ❌ Refactor cả những thứ không hề hỏng, lạc khỏi yêu cầu.
- ✅ Mỗi dòng thay đổi đều **truy được về đúng yêu cầu**.
- ✅ Giữ nguyên style sẵn có, kể cả khi mình sẽ làm khác.
- 💡 Ít chạm = ít token = ít rủi ro phá vỡ thứ đang chạy. Diff sạch còn dễ review hơn nhiều.

### §4 — GOAL-DRIVEN EXECUTION (Khai báo đích, loop tới khi đạt)

- ❌ Ra lệnh từng thao tác một (imperative), kèm sát từng bước rồi dừng nửa chừng.
- ❌ Nhận đề mơ hồ ("sửa cái bug đi") mà không chốt tiêu chí.
- ✅ Tự xác định **tiêu chí 'done' rõ ràng** (vd "viết test tái hiện bug, rồi cho nó pass") → tự **loop tới khi đạt**.
- ✅ Đề mơ hồ → hỏi để chốt tiêu chí trước (xem §1), rồi mới chạy.
- 💡 LLM cực giỏi lặp tới khi chạm goal. Tiêu chí mạnh → tự đi; tiêu chí yếu ("làm cho chạy") → phải cầm tay mãi.

### §5 — KHÔNG TỰ Ý CHỈNH SỬA NHỮNG THỨ KHÔNG LIÊN QUAN
- ❌ Không được tự ý chỉnh sửa, xoá bất cứ thứ gì khi chưa được cho phép.
- ❌ Chỉ được Deloy khi đã chỉnh sửa local và hoàn hảo và đồng ý cho Deloy.
- ❌ Trước khi chỉnh sửa hoặc xoá phải hỏi trước .
  
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
| **Giá Amazon ẩn/lazy-load → NHẬP TAY (đúng)**. Chỉ lấy giá từ JSON-LD/DOM buybox/offer-listing-THẬT. **TUYỆT ĐỐI KHÔNG dùng `.a-offscreen`** làm giá: khi buybox ẩn ("cannot ship"), `.a-offscreen` còn lại chỉ là giá widget **hàng liên quan/gợi ý** (sims) → giá rác (vd ¥6.979 cho máy ¥38.280). DOM Amazon đổi mỗi fetch nên không lọc tin cậy. Bỏ luôn `priceOptionsJpy` (dải giá tham khảo cũ = rác). `/gp/offer-listing/` cho hàng cannot-ship **bị redirect về trang dp** → guard `if($o('#productTitle')) return null` + chỉ đọc giá trong hàng offer thật (`.aod-offer`/`.olpOffer`). Giá ẩn → ô giá trống, khách nhập tay. Bump `PARSE_CACHE_VER` khi đổi logic giá để xoá cache nhiễm | `amazon-jp.parser.ts` (`unitPriceJpy`, `fetchOfferListingPrice`) + `parse-url/route.ts` (`PARSE_CACHE_VER`) |
| Cache kết quả parse vào Redis theo ASIN (`bfj:parse:asin:{ASIN}`, TTL 24h), bỏ `rawHtml` trước khi cache; lần sau khỏi load lại (5.8s→0.37s). Có cờ `refresh:true` + nút "🔄 Tải lại mới" để bỏ cache | `parse-url/route.ts` (`parseCacheKey`, `getCached/setCached`) + UI `bfj-url-form.tsx` (`handleParse(url, refresh)`) |
| Tự lấy cân nặng: `parseWeightKg` nhận nhãn JP/EN (重量/重さ/質量/item weight…), đơn vị JP (キログラム/グラム/ポンド) + latin, ưu tiên cân SP hơn cân kiện hàng (梱包/パッケージ), fallback quét rawHtml. Pre-fill ô kg | `amazon-jp.parser.ts` (`parseWeightKg`, `weightFromValue`) |
| Ẩn bảng "Bảng Phí Dịch Vụ" tĩnh — chỉ hiện bảng BÁO GIÁ sau khi tính; thêm ô nhập cân nặng (kg) để tính phí ship JP→VN (~160k/kg theo cân) | `bfj-url-form.tsx` (`manualWeightKg`, `handleManualCalculate`) |

---

## Quy chuẩn ảnh sản phẩm (BẮT BUỘC — áp dụng mọi lần thêm/sửa ảnh SP)

| Loại ảnh | Kích thước | Cách xử lý |
|---|---|---|
| **Ảnh chính** (`isPrimary: true`) | **đúng 850×850** px | `sharp fit:'contain'` + nền trắng `#fff` → canvas vuông chuẩn |
| Ảnh gallery phụ (nội dung/tính năng) | ≤ 850×850, giữ tỉ lệ | `sharp fit:'inside'`, không phóng to |
| Ảnh ngang (banner/lifestyle, tỉ lệ ≥ 1.3) | ≤ 1200×650 | `sharp fit:'inside'` |

**Quy trình thêm ảnh chính thủ công** (khi không qua AI Writer):
1. Download ảnh về local (`/tmp/`)
2. `sharp().resize(850, 850, { fit:'contain', background:{r:255,g:255,b:255} }).flatten({background:{r:255,g:255,b:255}}).jpeg({quality:90})` → `/tmp/tên-850.jpg`
3. Upload đè R2 bằng AWS S3Client (endpoint Cloudflare R2, bucket `japanvip-media`, folder `products/`)
4. Dùng MCP `add_product_image` với `isPrimary: true` để gắn vào DB

**Node.js S3Client config** (lấy từ `.env.local`):
```
endpoint: https://{CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com
credentials: R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY
bucket: R2_BUCKET_NAME = japanvip-media
```

---

## Việc đang chờ (chưa làm)
- **Google tìm ảnh** (search-images route + UI): đã cấu hình xong (project `japanvip-image-search`, billing Japan Vlp, key+CX trong `.env.local`, API enabled). Chờ Google kích hoạt Custom Search cho project mới (403 lúc đầu, tự thông sau vài giờ). KHÔNG cần làm thêm.
- Lấy giá Amazon chuẩn: **Amazon PA-API** (scrape tĩnh không chắc vì giá render JS + sponsored).
- Hỗ trợ amazon.com (US, USD→VNĐ — đụng vùng giá khoá).
- Exa lookup server-side: năm SX + đúng cảm biến từ trang hãng.
- **Auto-tìm trang VN theo model** cho tư liệu VN: hiện admin dán URL thủ công (đã chạy). Phần auto cần Google CSE web search (CX mới "tìm toàn web") — gated chờ CSE kích hoạt giống Google tìm ảnh.
