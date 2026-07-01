# Content Production Pipeline — JapanVip AI Content Team

Pipeline sản xuất nội dung có kiểm soát: tạo **bản nháp** chuẩn SEO từ nguồn sự thật đã duyệt,
và **chỉ publish sau khi con người đồng ý**. Không có hệ thống auto-publish mất kiểm soát.

```
Brief → Content Planning → Product Fact Checking → SEO Writing
      → SEO Review & Scoring → CMS Draft Creation → Human Approval → (Optional) Publish
```

Kiến trúc & cách tái sử dụng hệ thống hiện có: xem `docs/architecture/ai-content-team.md`.
Ngưỡng & điều kiện chặn: `.claude/workflows/content-quality-gates.json`.

## Team (6 agent trong `.claude/agents/`)

| Bước | Agent | Output |
|---|---|---|
| Planning | `content-planner` | `CONTENT_BRIEF.md` |
| Fact checking | `product-fact-checker` | `PRODUCT_FACTS.md` |
| Writing | `seo-writer` | `DRAFT_CONTENT.md` |
| Review & scoring (độc lập, ngữ cảnh mới) | `seo-reviewer` | `SEO_REVIEW.md`, `CONTENT_SCORECARD.json` |
| CMS draft (draft-only) | `cms-draft-publisher` | `CMS_DRAFT_REPORT.md` |
| Human approval | `content-approval-manager` | `APPROVAL_SUMMARY.md` |

Artifacts: `docs/content-runs/<content-id>/` (content-id = `YYYYMMDD-<type>-<slug>`),
gồm cả `STATUS.json` (trạng thái pipeline máy-đọc).

## Luật an toàn (mọi bước)
1. Mặc định **chỉ tạo nháp**; publish chỉ sau khi con người duyệt rõ ràng.
2. Không bịa thông số/sự thật; thiếu chắc → `[CẦN XÁC MINH]`.
3. Chỉ dùng nguồn đã duyệt (KB APPROVED/VERIFIED, Product Master, quan sát đã duyệt, tài liệu hãng).
4. Sản phẩm 100V → bắt buộc chèn cảnh báo biến áp.
5. Không sao chép câu chữ/ảnh đối thủ; ảnh chỉ dùng asset đã duyệt.
6. Không ghi đè nội dung đã publish, không xoá nội dung.
7. Không lộ CMS key / API secret.
8. Không bỏ qua finding critical/high hay điểm < 85.
9. Không đụng vùng 🔒 LOCKED (AI Writer "Trang Nhật"…) trong CLAUDE.md.

## Pha

### Pha 0 — Brief
Nhận brief → tạo `content-id` → tạo `docs/content-runs/<content-id>/` + `STATUS.json`
(`draft_requested`).

### Pha 1 — Content Planning
`content-planner` → `CONTENT_BRIEF.md` (loại nội dung, đối tượng, từ khoá chính/phụ, tiêu đề,
dàn ý, internal/product links, dữ liệu còn thiếu). Status → `planning`.

### Pha 2 — Product Fact Checking
`product-fact-checker` → `PRODUCT_FACTS.md` (chỉ nguồn đã duyệt; `[CẦN XÁC MINH]` cho chỗ chưa
chắc; cờ 100V). Status → `fact_checking`.

### Pha 3 — SEO Writing
`seo-writer` → `DRAFT_CONTENT.md` (chỉ dùng PRODUCT_FACTS; đủ 16 mục product / 13 mục blog;
FAQ + CTA + metadata + cảnh báo 100V nếu cần). Status → `writing`.

### Pha 4 — SEO Review & Scoring
`seo-reviewer` (ngữ cảnh mới, không phải writer) → `SEO_REVIEW.md` + `CONTENT_SCORECARD.json`.
- Trượt (điểm < 85 hoặc dính `blockedContentConditions`) → trả revision task cho `seo-writer`,
  lặp Writing→Review. **Tối đa 3 vòng.** Sau 3 vòng vẫn trượt → `ESCALATION.md`, dừng xin người.
- Đạt → status `approved_for_draft`.

### Pha 5 — CMS Draft Creation
`cms-draft-publisher` kiểm: score ≥ 85, không critical/high, đã fact-check → tạo **nháp**
(`Product.DRAFT` / `BlogPost.DRAFT` / `ContentAsset`) qua API sẵn có. KHÔNG publish, KHÔNG ghi đè,
KHÔNG xoá. → `CMS_DRAFT_REPORT.md`, status `draft_created` → `pending_human_approval`.

### Pha 6 — Human Approval
`content-approval-manager` → `APPROVAL_SUMMARY.md` (tiêu đề, loại, model, từ khoá, score,
fact-check, cảnh báo, link nháp, thiếu gì, đề xuất). Người chọn: Approve draft / Request revision
/ Reject / Approve for publish.

### Pha 7 — (Tuỳ chọn) Publish
Chỉ khi con người chọn **Approve for publish**. Auto-publish MẶC ĐỊNH TẮT; nếu sau này bật, chỉ
áp dụng blog rủi ro thấp `score ≥ 92` và không thuộc `autoPublishBlockedCategories`.

---

## Thiết kế lệnh CLI (design — chưa implement vòng này)

> Vòng setup này chỉ thiết kế lệnh. Script thật (`scripts/content.sh`) làm sau khi duyệt kiến
> trúc, chạy LOCAL, draft-only.

```bash
# Tạo nháp sản phẩm chuẩn SEO để duyệt
content create \
  --type "product" \
  --model "Panasonic F-VXV70" \
  --keyword "máy lọc không khí Panasonic nội địa Nhật" \
  --goal "Tạo bản nháp sản phẩm chuẩn SEO để tôi duyệt"

# Tạo bài blog SEO
content create \
  --type "blog" \
  --topic "Nồi cơm cao tần Nhật có thực sự ngon hơn nồi cơm thường?" \
  --keyword "nồi cơm cao tần Nhật" \
  --goal "Tạo bài SEO 1200 từ để đăng blog"

# Chạy review độc lập + chấm điểm cho một content-id
content review --content-id "CONTENT_ID"

# Tạo bản nháp trên CMS (chỉ khi gate đạt; draft-only)
content create-draft --content-id "CONTENT_ID"

# Xem trạng thái pipeline
content status --content-id "CONTENT_ID"
```

| Lệnh | Pha | Hành vi |
|---|---|---|
| `content create --type product\|blog\|fb\|zalo\|tiktok-script\|email\|meta-ad\|… ...` | 0→4 | Plan → Fact-check → Write → Review (loop ≤3) |
| `content review --content-id` | 4 | Chạy lại review độc lập + scorecard |
| `content create-draft --content-id` | 5 | Tạo nháp CMS nếu score ≥ 85, không critical/high |
| `content status --content-id` | — | In `STATUS.json` (trạng thái + điểm + cảnh báo) |

**Script thật:** `./scripts/content.sh` (scaffold content-id + thư mục run; pipeline do phiên Claude
điều phối, draft-only). **Nội dung đa kênh** (fb/zalo/tiktok/email/push/banner/meta-ad/chatbot…) →
tạo nháp `content_assets` (`PENDING_REVIEW`) qua `POST /api/v1/admin/content/assets` (đã nhận API key).

Mọi báo cáo/đầu ra: **tiếng Việt**. Publish luôn cần con người (Pha 6).
