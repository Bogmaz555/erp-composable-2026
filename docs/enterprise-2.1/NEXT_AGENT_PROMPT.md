<!-- generated 2026-08-02T20:07:19.893Z milestone=P0 phase=RELEASE sha=27da8a5 -->
<!-- Enterprise 2.1 — paste into Grok or /workflow -->

# AGENT MISSION — P0 RELEASE (autonomous)

Branch: `enterprise-2.1-p0-bootstrap`
Tag: **enterprise-2.1.p0-bootstrap**

## Task
1. `gh pr create --base master --head enterprise-2.1-p0-bootstrap` (or update)
2. Merge when green
3. Tag `enterprise-2.1.p0-bootstrap`; push tag
4. Advance STATUS (next DESIGN or DONE if P5)
5. Commit STATUS; push

START NOW.

## Autonomy contract
- ZERO confirmation pauses
- Read docs/enterprise-2.1/AGENT_CONTRACT.md
- After work: advance STATUS; commit; push; `pnpm run enterprise21:step`
- Forbidden: force-push master, filter-repo without APPROVED_BY_USER_A, secrets in git
