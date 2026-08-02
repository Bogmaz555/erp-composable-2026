# Enterprise 2.0 — Agent Contract (mandatory)

Any agent (Grok, workflow, scheduler RESUME) executing this program **must** follow:

## Autonomy

1. **No confirmation pauses.** Never ask “should I continue?” / “approve?”.
2. Read `docs/ENTERPRISE-2.0-STATUS.md` first; then `docs/enterprise-2.0/NEXT_AGENT_PROMPT.md`.
3. Execute only the **current** milestone/phase. Do not skip GATE.
4. After finishing the phase work, **update STATUS** and commit + push.
5. Then run: `pnpm run enterprise:step` (or `bash scripts/enterprise-2.0/run-automation.sh step`).

## Phase completion signals

| Phase | Done when | STATUS update |
|-------|-----------|---------------|
| DESIGN | Design file exists with `## PR Plan` and `### PR` sections | `phase: IMPLEMENT`, `state: READY` |
| IMPLEMENT | PR plan implemented on milestone branch; builds green enough for gates | `phase: GATE` |
| GATE | `gate-check.sh` exit 0 (or runner auto-advances) | `phase: RELEASE` |
| RELEASE | PR merged to master, tag pushed | advance to next milestone DESIGN (or DONE) |

Prefer: `node scripts/enterprise-2.0/advance-phase.mjs success "reason"` after honest completion, then `pnpm run enterprise:prompt`.

## Hard stops (must BLOCKED, not invent)

- Need `APPROVED_BY_USER_A=true` for filter-repo / secrets history A
- Need `SHARED_RLS` in STATUS to change tenancy from DEDICATED_STACK
- Force-push master forbidden
- DR live only `COMPOSE_PROJECT_NAME=erp-pilot-dr`

## Forbidden

- Readiness theater / Faza 29+
- AUTH_ENFORCE=false as enterprise default
- Core-NATS-only production path for enterprise tags
- Committing secrets

## Resume (paste / scheduler)

```text
RESUME Enterprise 2.0 full automation. No confirmation pauses.
Repo: /home/bogdan-mazur/PROGRAMY/ERP/erp-composable-2026
git fetch && git checkout enterprise-2.0-automation && git pull --ff-only || true
Read docs/ENTERPRISE-2.0-STATUS.md and docs/enterprise-2.0/NEXT_AGENT_PROMPT.md
Execute NEXT_AGENT_PROMPT fully. Update STATUS. Commit. Push.
Run: pnpm run enterprise:step
If phase still needs agent work, continue. If DONE, stop and report.
```
