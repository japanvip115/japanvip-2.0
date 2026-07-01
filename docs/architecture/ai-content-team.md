# Architecture — AI Content Agent Team (JapanVip)

> Tài liệu kiến trúc viết TRƯỚC khi implement (theo yêu cầu). Vòng này chỉ tạo:
> tài liệu kiến trúc + agent definitions + workflow + quality gates. **Chưa nối CMS thật,
> chưa publish gì.**

## 1. Nguyên tắc nền

- **Tái sử dụng**, không thay thế: dùng lại CMS/API, auth, design admin, và DB hiện có của
  JapanVip. KHÔNG cài CMS mới, KHÔNG sửa hành vi publish production.
- **Draft-only mặc định**: agent chỉ tạo bản nháp. Publish chỉ sau khi **con người duyệt**.
- **Knowledge Base là nguồn sự thật**: chỉ dùng dữ liệu đã DUYỆT/ĐÃ XÁC MINH.
- Không trùng lặp hệ thống AI đang có (AI Writer "Trang Nhật" 🔒 LOCKED, Content Studio, KB).
  Team này là **lớp điều phối** (planning + agents) sinh nháp QUA các API sẵn có.

## 2. Hệ thống hiện có được tái sử dụng (đã khảo sát)

| Thành phần | Vị trí thật | Vai trò trong pipeline |
|---|---|---|
| Auth admin/editor | `@/lib/api-auth` → `resolveEditorAuth(req)`; `@/lib/auth` `auth()` + `hasRole` | Mọi thao tác CMS phải qua guard này |
| Knowledge Base (nguồn sự thật) | `@/lib/content-studio/knowledge-db` → `getDbKnowledge(query, maxArticles, maxFacts)`; API `/api/v1/admin/knowledge/*` | Lấy Article **APPROVED** + Fact **VERIFIED** |
| Product Master Records | `Product` + `ProductAttribute` + `ProductImage` (Prisma `@japanvip/db`); MCP `japanvip`: `get_product`, `search_products` | Dữ liệu sản phẩm gốc |
| Tạo sản phẩm nháp | `POST /api/v1/admin/products` (status mặc định `DRAFT`) | cms-draft-publisher |
| Sửa nội dung/SEO/thuộc tính SP | MCP `japanvip`: `update_product_description`, `update_product_seo`, `upsert_product_attributes`, `add_product_image` | cms-draft-publisher |
| Tạo blog nháp | `POST /api/v1/admin/content/blog` (status `DRAFT`) | cms-draft-publisher |
| Nội dung đa kênh | `ContentAsset` + `POST /api/v1/admin/content/assets` | FB/TikTok/email drafts |
| Ảnh (chỉ asset đã duyệt) | MCP `upload_image_to_r2`, bucket R2 `japanvip-media` | KHÔNG dùng ảnh đối thủ |

## 3. Mô hình trạng thái (pipeline → DB)

Trạng thái pipeline (theo yêu cầu) sống trong `docs/content-runs/<content-id>/STATUS.json`
(máy-đọc). DB enum CHỈ bị chạm ở bước tạo nháp (draft) và bước publish (do người).

| Pipeline status | Biểu diễn ở DB |
|---|---|
| `draft_requested`, `planning`, `fact_checking`, `writing`, `reviewing` | chỉ trong content-run (chưa chạm DB) |
| `revision_required` | `ContentAsset.REVISION_REQUIRED` |
| `approved_for_draft` | gate pass (content-run) |
| `draft_created` | `Product.DRAFT` / `BlogPost.DRAFT` / `ContentAsset.AI_GENERATED`\|`PENDING_REVIEW` |
| `pending_human_approval` | `ContentAsset.PENDING_REVIEW` |
| `published` | `Product.ACTIVE` / `BlogPost.PUBLISHED` / `ContentAsset.PUBLISHED` — **chỉ do người** |
| `rejected` | `ContentAsset.REJECTED` |
| `archived` | `*.ARCHIVED` |

DB enums thật (không đổi): `ProductStatus(DRAFT|ACTIVE|SOLD|ARCHIVED)`,
`BlogPostStatus(DRAFT|SCHEDULED|PUBLISHED|ARCHIVED)`,
`ContentAssetStatus(DRAFT|AI_GENERATED|PENDING_REVIEW|REVISION_REQUIRED|APPROVED|SCHEDULED|PUBLISHED|REJECTED|ARCHIVED)`.

## 4. Nguồn dữ liệu hợp lệ cho Fact Checker (CHỈ nguồn đã duyệt)

1. **JapanVip Knowledge Base** — `getDbKnowledge()` (Article APPROVED + Fact VERIFIED).
2. **Product Master Records** — `Product`/`ProductAttribute` qua MCP `get_product`/`search_products`.
3. **Quan sát giá Nhật đã duyệt** — `Product.originPrice/marketPrice` + báo cáo giá trong Obsidian KB (`04 Vietnam Market Intelligence/Giá đối thủ/`, đã duyệt).
4. **Quan sát đối thủ VN đã duyệt** — Obsidian KB `01 Competitor Intelligence` (đã duyệt).
5. **Tài liệu hãng chính thức** — khi có; phải kèm `sourceReference` (URL).
6. **Listing nguồn sản phẩm đã duyệt** — `Product.originUrl` + listing BFJ đã duyệt.

Mọi claim không nằm trong 6 nguồn trên → đánh dấu **`[CẦN XÁC MINH]`**, không tự bịa.

## 5. Artifacts mỗi lần chạy

`docs/content-runs/<content-id>/` (content-id = `YYYYMMDD-<type>-<slug>`):
`CONTENT_BRIEF.md` · `PRODUCT_FACTS.md` · `DRAFT_CONTENT.md` · `SEO_REVIEW.md` ·
`CONTENT_SCORECARD.json` · `CMS_DRAFT_REPORT.md` · `APPROVAL_SUMMARY.md` · `STATUS.json`.

## 6. Bảo mật & ranh giới (vòng này)

- KHÔNG lộ CMS key / API secret trong log hay file. Auth qua `resolveEditorAuth` sẵn có.
- KHÔNG nối CMS production, KHÔNG publish trong giai đoạn setup.
- KHÔNG đụng vùng 🔒 LOCKED (AI Writer "Trang Nhật", publish-japan…) trong `CLAUDE.md`.
- Ảnh: chỉ asset đã duyệt; KHÔNG ảnh đối thủ.

## 7. Ngoài phạm vi vòng này (làm sau khi duyệt kiến trúc)

- Script CLI `content` thật (`scripts/content.sh`) — vòng này chỉ thiết kế lệnh trong workflow.
- Bảng theo dõi pipeline trong DB (nếu cần) — hiện dùng `STATUS.json` + `ContentAsset`.
- Đấu nối `cms-draft-publisher` vào API thật (chạy local, draft-only) — sau khi duyệt.
