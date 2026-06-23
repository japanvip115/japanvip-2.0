#!/usr/bin/env bash
# Khởi động Crawl4AI service (local). Tự tạo venv + cài deps nếu chưa có.
set -e
cd "$(dirname "$0")"

if [ ! -d .venv ]; then
  echo "→ Tạo venv 3.12 + cài Crawl4AI (lần đầu, vài phút)..."
  uv venv --python 3.12 .venv
  uv pip install --python .venv/bin/python -r requirements.txt
  .venv/bin/python -m playwright install chromium
  .venv/bin/crawl4ai-setup
fi

PORT="${CRAWLER_PORT:-8787}"
echo "→ Crawl4AI chạy tại http://127.0.0.1:${PORT}"
exec .venv/bin/python -m uvicorn server:app --host 127.0.0.1 --port "$PORT" --log-level warning
