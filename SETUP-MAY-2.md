# 🖥️ Setup máy thứ 2 (dùng thay phiên) — japanvip-2.0

> Kịch bản: dùng **thay phiên** (mỗi lúc 1 máy, ví dụ nhà ↔ công ty). Chỉ đồng bộ **code qua git**;
> DB (Neon) và Redis (Upstash) là **remote tập trung** nên cả 2 máy nhìn chung một nguồn, không lệch data.

## 🔑 Nguyên tắc vàng (làm đúng là hết chồng tréo)
1. **Rời máy đang dùng:** `git add -A && git commit -m "..." && git push`
2. **Bắt đầu máy kia:** `git pull`

Không để thay đổi chưa commit khi chuyển máy → không phân nhánh lệch → không merge conflict.
Nếu lỡ lệch: `git pull --rebase`.

## 🛠️ Cài lần đầu trên máy 2
```bash
git clone https://github.com/japanvip115/japanvip-2.0.git
cd japanvip-2.0
corepack enable            # tự lấy đúng pnpm@9.15.9
pnpm install              # cài deps theo pnpm-lock.yaml
# (tuỳ chọn) nếu dùng AI Writer cào ảnh trang hãng:
pnpm --filter web exec playwright install chromium
pnpm --filter web dev     # chạy dev (port 3000)
```

## ⚠️ Thứ git KHÔNG mang theo — phải làm tay trên máy 2
| Thứ | Cách xử lý |
|---|---|
| **`apps/web/.env.local`** (secrets: Neon, R2, Upstash, API keys — bị gitignore) | Copy tay từ máy chính qua kênh an toàn (AirDrop/USB/password manager). KHÔNG gửi qua git/email/chat. Đổi key 1 máy → copy lại file sang máy kia |
| **Đăng nhập GitHub** | `gh auth login` hoặc Personal Access Token |
| **`anh noi dung/`** (640MB ảnh cào — đã gitignore) | Không đi qua git. Cần ở máy 2 thì sync qua cloud drive (Google Drive/iCloud), hoặc cào lại |
| **Claude Code / NotebookLM CLI** | Login riêng từng máy (không tranh chấp) |

## 🚨 Lưu ý vận hành
- **Dev DB = production Neon** → đừng bật dev cả 2 máy ghi cùng lúc; dùng thay phiên là an toàn. Cẩn thận script ghi DB.
- `node_modules` không commit — mỗi máy tự `pnpm install`. `pnpm-lock.yaml` trong git đảm bảo deps giống hệt.
- Push lên `main` = Vercel auto-deploy production.
