# Feature Delivery Workflow — JapanVip AI Delivery Team

A continuous, gated pipeline that takes a feature request from plan to a pushed feature
branch, and **never** pushes to main or deploys production automatically.

```
Plan → Implement → Review → Score → Fix → Re-review → Commit → Push (feature branch only)
```

## Team

Four reusable Claude Code subagents in `.claude/agents/` (use Claude Code Agent Teams when
available; otherwise the lead orchestrates them via the Agent tool, with `SendMessage` for
inter-agent messaging):

| Role | Agent | Writes |
|---|---|---|
| Planner | `planner` | `PLAN.md`, `ACCEPTANCE_CRITERIA.md`, `RISK_REGISTER.md` |
| Implementer | `implementer` | `IMPLEMENTATION_REPORT.md`, `TEST_RESULTS.md` |
| Reviewer (independent, fresh context) | `reviewer` | `REVIEW.md`, `SCORECARD.json` |
| Release Manager | `release-manager` | `RELEASE_CHECKLIST.md`, `RELEASE_SUMMARY.md` |

All artifacts live in `docs/agent-runs/<task-id>/`.
Gate values are read from `.claude/workflows/quality-gates.json`.

## Isolation

Parallel work uses **Git worktrees or isolated feature branches** so concurrent tasks never
collide. One task = one `feature/<slug>` branch (or worktree) = one `docs/agent-runs/<task-id>/`.

## Safety rules (apply to every phase)

1. Never push to `main`, `master`, `production`, `deploy`, or `release`.
2. Never force-push.
3. Never delete branches, tags, environments, cloud resources, databases, or production data.
4. Never run destructive migrations automatically.
5. Never rotate credentials / API keys / payment or auth secrets without explicit owner approval.
6. Never deploy production automatically.
7. Never expose `.env*`, secrets, keys, tokens, customer or payment data in logs or commits.
8. Never bypass failed tests, lint, build, security findings, or the reviewer score threshold.
9. Always create a feature branch.
10. Always create an implementation report before pushing.
11. **Stop and ask the human** only on: a critical security issue · a destructive migration ·
    a payment/auction/auth/production-deploy risk · a missing business requirement that
    materially changes behavior · any need to permanently alter data.

---

## Phase 0 — Intake

- Receive the task description.
- Create a **task ID** (e.g. `YYYYMMDD-<slug>`).
- Create the **feature branch** (`feature/<slug>`) from up-to-date `main` — or an isolated worktree.
  Refuse if the current branch is protected.
- Create `docs/agent-runs/<task-id>/`.

## Phase 1 — Planning

- `planner` produces `PLAN.md`, `ACCEPTANCE_CRITERIA.md`, `RISK_REGISTER.md` (incl. DB/API
  impact, migration assessment, security/perf notes, test plan, rollback plan).
- The lead checks the risk register for **dangerous or ambiguous** requirements.
- If a blocking stop-and-ask trigger is present → **halt and escalate** to the human.
- Otherwise continue automatically.

## Phase 2 — Implementation

- `implementer` follows `PLAN.md` / `ACCEPTANCE_CRITERIA.md` exactly, smallest safe change first.
- Records changed files and validation results in `IMPLEMENTATION_REPORT.md` + `TEST_RESULTS.md`.
- May ask `planner` for clarification via team messaging.
- **Does not push.** Does not touch unrelated modules. Does not weaken security to pass checks.

## Phase 3 — Independent Review

- `reviewer` reviews in a **fresh context** (must not be the implementer agent).
- Produces `REVIEW.md` and `SCORECARD.json`; runs independent typecheck/lint/test/build.
- If `totalScore < 85`, or any Critical / unresolved High finding, or any failing check:
  - Reviewer writes **exact remediation tasks**.
  - Tasks go back to `implementer`; repeat Implementation → Review.
- **Maximum automatic repair cycles: 3.**
- After 3 failed review cycles → **stop** and prepare an **escalation report** for the human
  (`docs/agent-runs/<task-id>/ESCALATION.md`: history of cycles, residual findings, blockers).

## Phase 4 — Release Gate

`release-manager` verifies every gate (see its agent doc and `quality-gates.json`):
branch not protected · clean tree except expected changes · no secrets tracked · all five
artifact files present · score ≥ 85 · no Critical/High unresolved · typecheck · lint · test
(when present) · build.

- **All pass:**
  - Write `RELEASE_CHECKLIST.md` + `RELEASE_SUMMARY.md`.
  - Commit with conventional-commit format.
  - `git push -u origin <feature-branch>` — **feature branch only.**
  - Print: branch · commit hash · reviewer score · check results · remaining risks · suggested
    PR title · suggested PR description.
  - **Do not** merge into main. **Do not** deploy production.
- **Any fail:**
  - Do **not** push. Report the exact blocker(s) in `RELEASE_CHECKLIST.md`.

---

## Reference commands (mirror CI)

```bash
pnpm --filter @japanvip/db db:generate          # Prisma client (before typecheck)
pnpm --filter @japanvip/web exec tsc --noEmit   # typecheck (blocking in CI)
pnpm --filter @japanvip/web lint                # lint
pnpm --filter @japanvip/web build               # build
# test: only when a runner is configured (none today)
```

## Run a task

```bash
./scripts/run-ai-delivery.sh \
  --task "Optimize mobile homepage performance and reduce LCP below 2.5 seconds" \
  --branch "feature/mobile-performance-lcp"
```
