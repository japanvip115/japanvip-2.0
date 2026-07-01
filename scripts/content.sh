#!/usr/bin/env bash
# JapanVip Content Team — CLI scaffolder cho pipeline nội dung.
# Chỉ scaffold (content-id + thư mục run + STATUS.json). Pipeline thật (Plan→Fact-check→Write→
# Review→Draft→Approve) do phiên Claude điều phối theo .claude/workflows/content-production-pipeline.md.
# KHÔNG tự publish. Draft-only. Chạy LOCAL.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
RUNS_DIR="docs/content-runs"
PIPELINE=".claude/workflows/content-production-pipeline.md"
GATES=".claude/workflows/content-quality-gates.json"

usage() {
  cat <<'EOF'
Cách dùng:
  content create --type <blog|product|fb|zalo|tiktok-caption|tiktok-script|youtube-shorts|
                          youtube-outline|email|push|banner|meta-ad|chatbot>
                 [--topic "..."] [--model "..."] --keyword "..." [--goal "..."]
  content review      --content-id <ID>
  content create-draft --content-id <ID>
  content status      --content-id <ID>
EOF
}

CMD="${1:-}"; shift || true
TYPE="" TOPIC="" MODEL="" KEYWORD="" GOAL="" CONTENT_ID=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --type) TYPE="$2"; shift 2 ;;
    --topic) TOPIC="$2"; shift 2 ;;
    --model) MODEL="$2"; shift 2 ;;
    --keyword) KEYWORD="$2"; shift 2 ;;
    --goal) GOAL="$2"; shift 2 ;;
    --content-id) CONTENT_ID="$2"; shift 2 ;;
    *) echo "Tham số lạ: $1" >&2; usage; exit 2 ;;
  esac
done

slugify() {
  local s
  s="$(node -e 'process.stdout.write((process.argv[1]||"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[đĐ]/g,"d").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,48).replace(/-+$/,""))' "$1" 2>/dev/null)"
  [[ -z "$s" ]] && s="$(date +%H%M%S)"
  echo "$s"
}

case "$CMD" in
  create)
    [[ -z "$TYPE" || -z "$KEYWORD" ]] && { echo "Cần --type và --keyword" >&2; usage; exit 2; }
    SUBJECT="${MODEL:-$TOPIC}"; [[ -z "$SUBJECT" ]] && SUBJECT="$KEYWORD"
    CONTENT_ID="$(date +%Y%m%d)-${TYPE}-$(slugify "$SUBJECT")"
    DIR="${RUNS_DIR}/${CONTENT_ID}"
    mkdir -p "$DIR"
    cat > "${DIR}/TASK.md" <<EOF
# Content ${CONTENT_ID}
- Type: ${TYPE}
- Model: ${MODEL:-—}
- Topic: ${TOPIC:-—}
- Keyword: ${KEYWORD}
- Goal: ${GOAL:-—}
- Created: $(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF
    cat > "${DIR}/STATUS.json" <<EOF
{ "contentId": "${CONTENT_ID}", "contentType": "${TYPE}", "status": "draft_requested",
  "keyword": "${KEYWORD}", "score": null, "publishingMode": "human_approval_required" }
EOF
    echo "▶ Content ${CONTENT_ID} sẵn sàng. Run: ${DIR}"
    echo "▶ Pipeline: ${PIPELINE} (Plan → Fact-check → Write → Review → Draft → Human approval)"
    echo "▶ Gates: ${GATES} (điểm ≥85, draft-only, người duyệt mới publish)"
    ;;
  status)
    [[ -z "$CONTENT_ID" ]] && { echo "Cần --content-id" >&2; exit 2; }
    F="${RUNS_DIR}/${CONTENT_ID}/STATUS.json"
    [[ -f "$F" ]] && cat "$F" || { echo "Không thấy ${F}" >&2; exit 1; }
    ;;
  review|create-draft)
    [[ -z "$CONTENT_ID" ]] && { echo "Cần --content-id" >&2; exit 2; }
    DIR="${RUNS_DIR}/${CONTENT_ID}"
    [[ -d "$DIR" ]] || { echo "Không thấy ${DIR}" >&2; exit 1; }
    echo "▶ '${CMD}' cho ${CONTENT_ID} — do phiên Claude thực hiện theo ${PIPELINE}."
    echo "  review: chạy seo-reviewer (chấm điểm, gate ≥85)."
    echo "  create-draft: cms-draft-publisher tạo NHÁP (chỉ khi gate đạt). KHÔNG publish."
    ;;
  ""|-h|--help|help) usage ;;
  *) echo "Lệnh lạ: ${CMD}" >&2; usage; exit 2 ;;
esac
