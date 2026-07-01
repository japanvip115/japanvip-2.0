# Kế hoạch & Kiến trúc — Mở rộng Content Team sang Content Studio (đa kênh)

> Trạng thái: **KẾ HOẠCH (chưa code)**. Hướng đã chốt với chủ dự án: **mở rộng Content Team
> (an toàn) — KHÔNG sửa route `studio/generate` đang chạy**. Tài liệu này để duyệt trước.

## 1. Mục tiêu
Cho phép Content Team (Plan → Fact-check → Write → Review/Score → Draft → Human approval) tạo
**nội dung đa kênh** (Facebook, Zalo, TikTok, YouTube, Email, Push, Banner, Meta Ad, Chatbot)
dưới dạng **nháp `content_assets`**, với **đúng kỷ luật chất lượng** như blog: fact-check, cảnh
báo 100V, không bịa, chấm điểm ≥85, người duyệt mới publish.

## 2. Ràng buộc (an toàn)
- ❌ KHÔNG sửa `apps/web/src/app/api/v1/admin/content/studio/generate/route.ts` (đang chạy).
- ❌ KHÔNG bật auto-publish; ❌ KHÔNG đổi DB schema (đã đủ); ❌ KHÔNG đụng vùng 🔒 LOCKED.
- ✅ Tái sử dụng bảng `content_assets`, enum `ContentAssetStatus`, `ContentChannel`, `channels.ts`,
  `getDbKnowledge`. "Tạo nhanh" của Content Studio giữ nguyên — chạy song song.

## 3. Hiện trạng (đã khảo sát)
- `studio/generate` tạo content_assets với `status: AI_GENERATED`, **không có cổng chất lượng**.
- `content_assets` đã có vòng trạng thái: `AI_GENERATED → PENDING_REVIEW → APPROVED → PUBLISHED`
  (+ `REVISION_REQUIRED/REJECTED/ARCHIVED`) → khớp sẵn với pipeline Content Team.
- 11 kênh + hint/ràng buộc đã định nghĩa trong `apps/web/src/lib/content-studio/channels.ts`
  (FACEBOOK, ZALO, TIKTOK_CAPTION/SCRIPT, YOUTUBE_SHORTS/OUTLINE, EMAIL, PUSH, BANNER, META_AD, CHATBOT).
- `POST /content/assets` (`createSchema`): nhận `title, channel, body, status(DRAFT|AI_GENERATED|
  PENDING_REVIEW), provider, sourceProductId, sourceTopic, goal, audience, metadata{}`.

## 4. Kiến trúc tích hợp
```
Brief → content-planner (nhận diện KÊNH + ràng buộc kênh từ channels.ts)
      → product-fact-checker (dùng chung; KB + 100V; chế độ có/không gắn SP)
      → seo-writer (xuất nội dung THEO KÊNH: char-limit, hashtag, hook, CTA…)
      → seo-reviewer (rubric thích ứng KÊNH: đúng sự thật + 100V + fit kênh + CTA)
      → cms-draft-publisher → ghi content_assets (status PENDING_REVIEW)
      → content-approval-manager → người duyệt → (tuỳ chọn) publish
```
Cả "tạo nhanh" (cũ) và "tạo có cổng" (mới) **cùng đổ vào `content_assets`** → hiện chung trên
admin Content Studio. Khác biệt: nội dung Content Team có `metadata.reviewerScore`, nguồn, content-id.

## 5. ⚠️ Quyết định cần chủ dự án duyệt — auth khi ghi content_assets
`POST /content/assets` hiện chỉ nhận **session EDITOR** (không nhận Bearer API key như route blog).
Để cms-draft-publisher ghi nháp được, chọn 1 trong 2:
- **(A) Khuyên dùng — thêm `resolveEditorAuth` vào route assets** (sửa *additive*, tương thích
  ngược: vẫn cho session, thêm chấp nhận API key content giống route blog). Chạm ~3 dòng code cũ
  → cần bạn đồng ý vì là code đang chạy.
- **(B) Ghi thẳng qua Prisma** (script Content Team, không qua API). Không chạm code app, nhưng bỏ
  qua validation của route.

→ **ĐÃ CHỐT: Phương án A** (2026-07-01, chủ dự án duyệt). Thêm `resolveEditorAuth` vào
`POST /content/assets` — *additive*, giữ nguyên nhánh session cũ, chỉ thêm chấp nhận Bearer API
key content (giống route blog). Đây là thay đổi code-cũ DUY NHẤT của cả tích hợp này. Việc code
sẽ làm ở bước triển khai sau khi được bật đèn xanh.

## 6. Map trạng thái pipeline ↔ ContentAssetStatus
| Pipeline | content_assets |
|---|---|
| writing | (chưa ghi DB) |
| reviewing / revision_required | `REVISION_REQUIRED` |
| approved_for_draft / draft_created | `AI_GENERATED` |
| pending_human_approval | `PENDING_REVIEW` |
| published | `PUBLISHED` (chỉ do người) |
| rejected / archived | `REJECTED` / `ARCHIVED` |

## 7. Metadata lưu kèm mỗi asset
`metadata = { contentId, reviewerScore, contentMode (product|marketing), sources[], blockedConditions[] }`.

## 8. Cổng chất lượng cho nội dung kênh
- Áp `content-quality-gates.json`: score ≥ 85; chặn nếu dính `missing_100v_warning`,
  `unverified_price_claim`, `unsupported_warranty_claim`, `copied_competitor_text`,
  `critical_factual_issue`.
- **Auto-publish: TẮT** cho mọi kênh (nội dung thương mại → luôn cần người). `META_AD`, giá, bảo
  hành thuộc nhóm cấm auto-publish.
- Rubric reviewer điều chỉnh cho kênh: thay "SEO blog" bằng **"fit kênh"** (đúng định dạng/độ dài/
  hashtag/CTA của channels.ts); giữ nguyên trọng số Độ chính xác (30) + an toàn.

## 9. Thay đổi từng agent (sẽ làm ở bước triển khai — CHƯA làm)
- `content-planner`: thêm bước **nhận diện kênh** + nạp ràng buộc kênh từ `channels.ts`.
- `product-fact-checker`: dùng nguyên (đã hỗ trợ có/không gắn SP).
- `seo-writer`: thêm **đặc tả output theo kênh** (FB: hook+lợi ích+CTA+hashtag; PUSH <120 ký tự;
  META_AD: primary text+headline+description; …) — bám hint sẵn của `channels.ts`.
- `seo-reviewer`: rubric "fit kênh"; vẫn chặn theo gates.
- `cms-draft-publisher`: thêm đường ghi **content_assets** (ngoài blog/product).
- `content-approval-manager`: duyệt trên content_assets (status PENDING_REVIEW → APPROVED/PUBLISHED).

## 10. "Hoàn chỉnh Content Team" — checklist
1. CLI thật `scripts/content.sh` (`content create --type fb|zalo|tiktok-script|email|meta-ad …`).
2. Nối cms-draft-publisher: blog ✅ · trang sản phẩm · **đa kênh content_assets** (mới).
3. Map trạng thái (mục 6) + metadata (mục 7).
4. Tài liệu cập nhật + 1 lần chạy thử mỗi loại kênh (tạo NHÁP, không publish).

## 11. Phạm vi & rủi ro
- **KHÔNG** sửa generate route, **KHÔNG** auto-publish, **KHÔNG** đổi schema, **KHÔNG** đụng vùng khoá.
- Rủi ro thấp: chỉ thêm agent (markdown) + CLI + (tuỳ chọn A) ~3 dòng auth additive.
- Test: chạy thử tạo nháp 1-2 kênh, xác minh hiện trong admin Content Studio, không ảnh hưởng "tạo nhanh".

## 12. Thứ tự triển khai đề xuất (khi bạn duyệt)
1. Chốt **A hay B** (mục 5).
2. Cập nhật 5 agent (mục 9) + gates rubric kênh.
3. Viết `scripts/content.sh`.
4. Chạy thử 1 kênh (vd Facebook) → tạo nháp content_assets → bạn xem trong admin.
5. Mở rộng dần các kênh còn lại.
