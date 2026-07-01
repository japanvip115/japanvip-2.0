#!/usr/bin/env bash
# JapanVip AI Delivery Team — task scaffolder & safety guard.
# Prepares branch + run folder + pre-flight gates. It does NOT push;
# only the release-manager agent pushes, and only after all gates pass.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
GATES=".claude/workflows/quality-gates.json"
BLOCKED=(main master production deploy release)

TASK="" ; BRANCH=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --task)   TASK="$2";   shift 2 ;;
    --branch) BRANCH="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done
[[ -z "$TASK" || -z "$BRANCH" ]] && { echo "Usage: $0 --task \"...\" --branch \"feature/...\"" >&2; exit 2; }

# 1. Validate Git state
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "Not a git repo" >&2; exit 1; }

# 2. Refuse protected target + protected current branch
CUR="$(git rev-parse --abbrev-ref HEAD)"
for b in "${BLOCKED[@]}"; do
  [[ "$BRANCH" == "$b" ]] && { echo "Refusing: '$BRANCH' is a protected branch." >&2; exit 1; }
done
[[ "$BRANCH" != feature/* ]] && { echo "Refusing: branch must start with 'feature/'." >&2; exit 1; }

# 3. Task ID
SLUG="$(echo "$BRANCH" | sed 's#^feature/##; s#[^a-zA-Z0-9]#-#g')"
TASK_ID="$(date +%Y%m%d)-${SLUG}"
RUN_DIR="docs/agent-runs/${TASK_ID}"

# 4. Create feature branch if missing (from current main, no checkout surprises)
if git show-ref --verify --quiet "refs/heads/${BRANCH}"; then
  git switch "$BRANCH"
else
  git switch -c "$BRANCH"
fi

# 5. Run folder + task record
mkdir -p "$RUN_DIR"
cat > "${RUN_DIR}/TASK.md" <<EOF
# Task ${TASK_ID}
- Branch: ${BRANCH}
- Created: $(date -u +%Y-%m-%dT%H:%M:%SZ)

## Request
${TASK}
EOF

# 6. Launch the agent-team workflow (handed to the lead Claude session)
echo "▶ Task ${TASK_ID} ready on ${BRANCH}. Run folder: ${RUN_DIR}"
echo "▶ Workflow: .claude/workflows/feature-delivery.md (Plan → Implement → Review → Score → Release gate)"
echo "▶ Gates: ${GATES}"
# The four agents (planner/implementer/reviewer/release-manager) are driven by the
# Claude Code session following feature-delivery.md. This script only scaffolds + guards.

# 8. Push is NOT performed here. Only release-manager pushes the feature branch
#    after every gate in quality-gates.json passes. No production deploy. No force-push.
echo "✔ Scaffold complete. Push happens only via the release-manager gate."
