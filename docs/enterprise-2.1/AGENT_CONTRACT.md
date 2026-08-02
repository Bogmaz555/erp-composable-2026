# Enterprise 2.1 — Agent Contract

## Autonomy

1. No confirmation pauses.  
2. Read `docs/ENTERPRISE-2.1-STATUS.md` then `docs/enterprise-2.1/NEXT_AGENT_PROMPT.md`.  
3. Only current milestone/phase. Do not skip GATE.  
4. Do not reset or rewrite Enterprise 2.0 STATUS (stays DONE).  
5. After work: update 2.1 STATUS, commit, push, `pnpm run enterprise21:step`.

## Phase completion

| Phase | Done when |
|-------|-----------|
| DESIGN | Design file with `## PR Plan` and `### PR` sections |
| IMPLEMENT | PR plan implemented on phase branch |
| GATE | `gate-check` exit 0 |
| RELEASE | PR merged to master + tag |

## Hard stops

- `APPROVED_BY_USER_A` for filter-repo  
- Force-push master forbidden  
- DR live only approved compose project  
- No secrets in git  
- No Faza 29+ / readiness theater  

## Resume

```text
RESUME Enterprise 2.1. Repo /home/bogdan-mazur/PROGRAMY/ERP/erp-composable-2026
Read ENTERPRISE-2.1-STATUS + NEXT_AGENT_PROMPT. Execute. Push. pnpm run enterprise21:step
```
