# Enterprise 2.1 — automation runbook

## Co to jest

Sterowanie programem **2.1 (P0→P5 → enterprise-2.1.0)** bez ręcznego wymyślania promptów.

| Plik | Rola |
|------|------|
| `docs/ENTERPRISE-2.1-PLAN.md` | plan programu |
| `docs/ENTERPRISE-2.1-STATUS.md` | maszyna stanów |
| `docs/enterprise-2.1/milestones.json` | bramki P0–P5 |
| `docs/enterprise-2.1/NEXT_AGENT_PROMPT.md` | aktualny prompt |
| `docs/enterprise-2.1/AGENT_CONTRACT.md` | reguły agenta |
| `scripts/enterprise-2.1/` | runner (reuse logiki 2.0) |

**2.0 jest DONE** — nie mieszać STATUS 2.0 z 2.1.

## Komendy

```bash
cd /home/bogdan-mazur/PROGRAMY/ERP/erp-composable-2026
pnpm run enterprise21:prompt
pnpm run enterprise21:step      # exit 10 = agent needed
pnpm run enterprise21:gate
pnpm run enterprise21:loop
pnpm run enterprise21:status
pnpm run enterprise21:advance -- success
```

## Stany

```
READY + DESIGN|IMPLEMENT|RELEASE → agent (NEXT_AGENT_PROMPT)
READY + GATE                     → gate-check
BLOCKED                          → fix → advance success
DONE                             → enterprise-2.1.0
```

## Resume

```text
RESUME Enterprise 2.1 full automation. No confirmation pauses.
Repo: /home/bogdan-mazur/PROGRAMY/ERP/erp-composable-2026
git fetch && git checkout enterprise-2.1-automation && git pull --ff-only || true
Read docs/ENTERPRISE-2.1-STATUS.md and docs/enterprise-2.1/NEXT_AGENT_PROMPT.md
Execute fully. Commit. Push. pnpm run enterprise21:step
```

## Bezpieczeństwo

- Brak force-push master  
- DR live tylko `COMPOSE_PROJECT_NAME=erp-pilot-dr` (lub STATUS override)  
- Brak filter-repo bez `APPROVED_BY_USER_A=true`  
