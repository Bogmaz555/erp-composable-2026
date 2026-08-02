<!-- generated 2026-08-02T12:28:20.127Z milestone=Q3 phase=RELEASE sha=3e0df92 -->
<!-- Unattended: paste into Grok OR run /workflow enterprise-20-step|continuous -->

# AGENT MISSION — Q3 RELEASE (autonomous)

Repo: /home/bogdan-mazur/PROGRAMY/ERP/erp-composable-2026
Branch: `enterprise-0.4-isolation-scale`
Tag: **enterprise-0.4-isolation-scale**

## Task
1. Ensure gates green
2. `gh pr create --base master --head enterprise-0.4-isolation-scale` (or update existing)
3. Merge when required CI green (admin OK if only optional red)
4. Tag `enterprise-0.4-isolation-scale` on merge commit; push tag
5. Advance STATUS to next milestone DESIGN (or DONE if Q5)
6. Commit STATUS on master or automation branch; push

Milestone order: Q0→Q1→Q2→Q3→Q4→Q5→DONE

START NOW.

## Autonomy contract (mandatory)
- ZERO confirmation pauses. Execute fully.
- Read also: docs/enterprise-2.0/AGENT_CONTRACT.md
- After work: update STATUS (or `node scripts/enterprise-2.0/advance-phase.mjs success "reason"`)
- Commit + push, then: `pnpm run enterprise:step`
- Forbidden: force-push master, filter-repo without APPROVED_BY_USER_A, secrets in git, readiness theater
