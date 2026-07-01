# Kế hoạch — Nối cầu Content Studio → Facebook Marketing (đăng fanpage)

> Trạng thái: **ĐÃ TRIỂN KHAI (Phương án A, 2026-07-01)**. Nguyên tắc: **người bấm mới đăng —
> KHÔNG tự động**; chỉ tạo NHÁP FacebookPost, việc đăng lên fanpage vẫn là hành động riêng của
> con người trong công cụ Facebook Marketing.
>
> **Đã làm & test:** (1) endpoint `POST /api/v1/admin/content/assets/[id]/to-facebook` — chỉ nhận
> asset APPROVED/FACEBOOK, tạo FacebookPost `DRAFT`, ghi ngược `metadata.facebookPostId` (chống
> trùng → 409). (2) nút UI "Đăng lên fanpage" cho asset APPROVED/FACEBOOK trong Content Studio.
> Test runtime OK: tạo DRAFT (angle/linkUrl map đúng, publishedAt null), gọi lần 2 → 409. typecheck PASS.

## 1. Mục tiêu
Từ một `content_asset` **đã duyệt (APPROVED)** kênh **FACEBOOK**, cho phép **1 nút "Đăng lên
fanpage"** → tạo một `FacebookPost` trạng thái **DRAFT** (map nội dung sang), để admin xem lại rồi
đăng/lên lịch bằng luồng Facebook Marketing sẵn có. Bỏ bước copy tay.

## 2. Hệ thống hiện có được tái sử dụng (đã khảo sát)
| Thành phần | Vị trí | Vai trò |
|---|---|---|
| Model `FacebookPost` | Prisma (`message, imageUrls, linkUrl, firstComment, angle, status DRAFT/SCHEDULED/PUBLISHED/FAILED, scheduledAt, publishedAt, fbPostId, productId, createdBy`) | Bản ghi bài fanpage |
| Tạo bài | `POST /api/v1/admin/content/facebook` (status `DRAFT`|`SCHEDULED`, auth session EDITOR) | Tạo FacebookPost |
| Đăng thật lên fanpage | `lib/social/facebook-publish.ts` + `facebook.service.ts`; cron `publish-facebook` / `publish-scheduled` | Push Graph API → fanpage |

→ Cầu nối **không cần** đụng logic đăng fanpage; chỉ tạo `FacebookPost` DRAFT từ asset đã duyệt.

## 3. Kiến trúc đề xuất
- **Backend (additive):** endpoint mới `POST /api/v1/admin/content/assets/[id]/to-facebook`
  - Kiểm: asset tồn tại, `channel = FACEBOOK`, `status = APPROVED`.
  - Tạo `FacebookPost` qua cùng logic route facebook (hoặc gọi trực tiếp prisma) với:
    | FacebookPost | ← nguồn từ content_asset |
    |---|---|
    | `message` | `asset.body` |
    | `linkUrl` | từ `metadata.sourceBlogSlug` → `https://japanvip.vn/blog/{slug}` (nếu có) |
    | `imageUrls` | `[]` (hoặc `metadata.imageUrls` nếu có) |
    | `angle` | suy từ `asset.goal` (mặc định `product`) |
    | `status` | **`DRAFT`** (KHÔNG scheduled/publish tự động) |
    | `productId` | `asset.sourceProductId` |
    | `createdBy` | user session / fallback admin |
  - Ghi ngược `asset.metadata.facebookPostId` để truy vết (tránh tạo trùng).
- **UI:** ở Content Studio, với asset **APPROVED + FACEBOOK**, thêm nút **"Đăng lên fanpage"** →
  gọi endpoint trên → báo "Đã tạo nháp bài fanpage, mở Facebook Marketing để đăng".

## 4. An toàn (bắt buộc)
- ❌ KHÔNG tự đăng: chỉ tạo `FacebookPost` **DRAFT**. Đăng lên trang vẫn là hành động riêng của
  người trong Facebook Marketing (nút Đăng/Lên lịch sẵn có).
- ❌ KHÔNG lộ token fanpage.
- ❌ KHÔNG đụng logic đăng (`facebook-publish.ts`) hay cron.
- ✅ Chỉ asset **APPROVED** kênh FACEBOOK mới đủ điều kiện.
- ✅ Chống tạo trùng (kiểm `metadata.facebookPostId`).

## 5. Điểm cần chủ dự án quyết
- **(A) Nút tạo NHÁP FacebookPost** (khuyên dùng — an toàn nhất; người vẫn tự đăng ở FB Marketing).
- (B) Nút mở thẳng composer FB Marketing đã điền sẵn (không tạo bản ghi) — UI-only, không endpoint.
- Link bài: mặc định lấy `metadata.sourceBlogSlug` → URL blog. Nếu asset không có → `linkUrl` trống.

## 6. Phạm vi & rủi ro
- Chỉ kênh **FACEBOOK** trước (Zalo/khác tính sau).
- Outward-facing (liên quan fanpage thật) → giữ human-in-loop tuyệt đối; cầu chỉ tạo nháp.
- Rủi ro thấp: thêm 1 endpoint + 1 nút UI, không sửa luồng đăng.

## 7. Các bước triển khai (khi bật đèn xanh)
1. Chốt (A) hay (B) ở mục 5.
2. (A) Viết endpoint `assets/[id]/to-facebook` (additive) + map field.
3. Thêm nút UI "Đăng lên fanpage" cho asset APPROVED/FACEBOOK.
4. Test: duyệt 1 asset FB → bấm → tạo FacebookPost DRAFT → kiểm trong FB Marketing (CHƯA đăng).
5. typecheck + build. Commit trên `feature/ai-content-team`.
6. Người đăng thật bằng luồng FB Marketing như thường lệ.

> Không đụng route/luồng nào ngoài phạm vi; không tự đăng; không sửa vùng đã chốt trong CLAUDE.md.
