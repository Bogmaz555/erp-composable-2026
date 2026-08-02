<!-- generated 2026-08-02T20:05:21.234Z milestone=P0 phase=GATE sha=52c9513 -->
<!-- Enterprise 2.1 — paste into Grok or /workflow -->

# AGENT MISSION — P0 GATE (autonomous)

## Task
1. `bash scripts/enterprise-2.1/gate-check.sh P0`
2. Fix up to 3 times or STATUS BLOCKED
3. On pass: STATUS phase=RELEASE, commit, push

START NOW.

## Autonomy contract
- ZERO confirmation pauses
- Read docs/enterprise-2.1/AGENT_CONTRACT.md
- After work: advance STATUS; commit; push; `pnpm run enterprise21:step`
- Forbidden: force-push master, filter-repo without APPROVED_BY_USER_A, secrets in git
