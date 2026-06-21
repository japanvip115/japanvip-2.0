# CLAUDE.md — japanvip-2.0

> Kế thừa toàn bộ chỉ dẫn ở `../CLAUDE.md` (thông tin công ty, tech stack, quy tắc code, ngôn ngữ tiếng Việt).

---

## 🔒 LOCKED — VÙNG CODE ĐÃ CHỐT, KHÔNG ĐƯỢC TỰ Ý SỬA/XOÁ

**Các phần dưới đây đã được chủ dự án (Nguyễn Thị Giang) duyệt và khoá (2026-06).**
**TUYỆT ĐỐI KHÔNG sửa, refactor, đổi tên, hay xoá nếu CHƯA được chủ dự án yêu cầu rõ ràng trong phiên hiện tại.** Nếu cần đổi, phải HỎI và chờ chủ dự án đồng ý trước.

### AI Content Writer — tab "Trang Nhật" (luồng scrape Amazon → tạo nội dung → publish)

| Quy tắc đã khoá | File / Hàm |
|---|---|
| Dịch tên VN `[Loại][Thương hiệu][Model][Dung tích]`, bỏ tiếng Nhật/chữ thừa | `apps/web/src/app/api/v1/admin/ai/generate-content/route.ts` → `buildProductNamePrompt`, type `product_name` |
| Chèn ảnh đã chọn vào mô tả theo ngữ cảnh, đúng URL | cùng file → `buildImageBlock` |
| Ép toàn bài tiếng Việt (dịch nhãn thông số Nhật→Việt) | cùng file → `VI_ONLY_RULE` |
| KHÔNG ghi placeholder máy móc ("Đang cập nhật", "Cần Japan VIP xác nhận") — thiếu thì bỏ dòng | cùng file → `NO_PLACEHOLDER_RULE` |
| Tự dịch tên khi tạo nội dung + nút ✨ + mô tả dùng tên Việt | `apps/web/src/app/admin/content/ai-writer/ai-writer-client.tsx` → `translateName`, `generate`, `streamOne` |
| Khối PHẢI trên trang sản phẩm ([quick]/[promo]/[warranty]) = **admin tự thêm**, AI KHÔNG điền | `apps/web/src/app/api/v1/admin/ai/publish-japan/route.ts` (mục lưu attributes) |
| Quy đổi giá ¥→VNĐ theo tỷ giá DB → `salePrice` | cùng file (mục tính `salePrice`) |
| Map ảnh nguồn → R2 trong mô tả lúc publish | cùng file (mục `finalDescription`) |
| Scraper lấy giá đúng biến thể + bắt công suất/điện áp (`table.a-keyvalue`/`.prodDetTable`) | `apps/web/src/app/api/v1/admin/ai/scrape-japan/route.ts` |

**Lưu ý vận hành:** AI Writer dùng provider **Claude Code Opus 4.8 (miễn phí)** — chỉ chạy LOCAL (Vercel không có CLI). Không dùng Anthropic API (mất phí).

---

## Việc đang chờ (chưa làm)
- Tìm thêm ảnh Google theo Model (Google Custom Search API — cần `GOOGLE_SEARCH_API_KEY` + `GOOGLE_SEARCH_CX`).
- Exa lookup server-side để tự điền năm sản xuất + đúng loại cảm biến từ trang hãng (cần Exa API key).
