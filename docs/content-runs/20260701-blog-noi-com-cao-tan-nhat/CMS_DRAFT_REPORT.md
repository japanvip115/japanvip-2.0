# CMS DRAFT REPORT — 20260701-blog-noi-com-cao-tan-nhat

## Kết quả tạo nháp
- **Loại:** Blog
- **Endpoint:** `POST /api/v1/admin/content/blog` (auth Bearer `api_key_content`, không lộ key)
- **HTTP:** 201 Created
- **Post ID:** `8bd1c5f7-7b85-4d75-99b1-19a3866d8505`
- **Slug:** `noi-com-cao-tan-nhat-co-ngon-hon-noi-thuong`
- **Status:** `DRAFT` (ẩn hoàn toàn với khách; `publishedAt = null`)
- **Tác giả:** auto-gán admin (route fallback)
- **Nội dung:** 4282 ký tự, có cảnh báo 100V

## Gate đã kiểm trước khi tạo
- SEO score 92 ≥ 85 ✅
- Không critical/high ✅
- Đã fact-check (PRODUCT_FACTS.md) ✅
- `blockedContentConditions`: none ✅
- Publish vẫn cần con người ✅ (chưa publish)

## An toàn
- Không publish, không ghi đè bài đã PUBLISHED, không xoá gì.
- Không dùng ảnh đối thủ (bài không nhúng ảnh ngoài; thumbnail null).
- Không lộ CMS key/secret.

## Metadata nháp
| Field | Giá trị |
|---|---|
| content_id | 20260701-blog-noi-com-cao-tan-nhat |
| content_type | blog |
| source references | PRODUCT_FACTS.md (KB query: 0 bài duyệt → viết mức công nghệ chung) |
| reviewer score | 92 |
| approval status | pending_human_approval |
| created_by | admin (API key content) |
| db record | blog_posts.id = 8bd1c5f7-7b85-4d75-99b1-19a3866d8505 |

## Xem nháp
- Admin: trang `/admin/content/blog` → mở bài "Nồi cơm cao tần Nhật…".
