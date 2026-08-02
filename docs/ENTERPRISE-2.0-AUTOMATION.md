# Enterprise 2.0 — Full automation runbook (unattended)

## Cel

Program **Q0→Q5 → enterprise-2.0.0** bez ręcznego wymyślania promptów i bez przerw:

| Warstwa | Co robi |
|---------|---------|
| **Control plane** | STATUS + milestones.json + NEXT_AGENT_PROMPT |
| **Local driver** | auto-GATE, lock, handoff, push |
| **Grok agent / workflow** | DESIGN · IMPLEMENT · RELEASE |
| **Scheduler** | RESUME co 2–6 h jeśli sesja umarła |

## Pliki

| Plik | Rola |
|------|------|
| `docs/ENTERPRISE-2.0-PLAN.md` | plan programu |
| `docs/ENTERPRISE-2.0-STATUS.md` | maszyna stanów |
| `docs/ADRs/ADR-008-…` | non-negotiables |
| `docs/enterprise-2.0/milestones.json` | bramki Q0–Q5 |
| `docs/enterprise-2.0/NEXT_AGENT_PROMPT.md` | **aktualny prompt** (generowany) |
| `docs/enterprise-2.0/AGENT_CONTRACT.md` | reguły agenta |
| `docs/enterprise-2.0/state/` | lock, handoff, RESUME.txt |
| `scripts/enterprise-2.0/autonomous-driver.sh` | unattended tick |
| `scripts/enterprise-2.0/run-automation.sh` | step/loop/gate |
| `.grok/workflows/enterprise-2.0-*.rhai` | Grok workflows |

## Instalacja (raz)

```bash
cd /home/bogdan-mazur/PROGRAMY/ERP/erp-composable-2026
git checkout enterprise-2.0-automation
pnpm install
pnpm run enterprise:install
```

## Start pełnej automatyzacji (bez przerw)

### 1) Jednorazowo w tej sesji Grok

```text
/workflow enterprise-2.0-continuous
```

albo wklej `docs/enterprise-2.0/NEXT_AGENT_PROMPT.md` i pracuj autonomicznie.

### 2) Scheduler RESUME (durable, co 2h)

Treść zadania (Grok scheduled task):

```text
RESUME Enterprise 2.0 full automation. No confirmation pauses.
Repo: /home/bogdan-mazur/PROGRAMY/ERP/erp-composable-2026
git fetch && git checkout enterprise-2.0-automation && git pull --ff-only || true
Read docs/ENTERPRISE-2.0-STATUS.md and docs/enterprise-2.0/NEXT_AGENT_PROMPT.md
and docs/enterprise-2.0/AGENT_CONTRACT.md
Execute NEXT_AGENT_PROMPT fully. Update STATUS. Commit. Push.
Run: pnpm run enterprise:step
If DONE stop. If BLOCKED fix if possible else report. Else continue.
```

### 3) Lokalna pętla GATE (opcjonalnie, w tle)

```bash
nohup env ENTERPRISE_LOOP_SLEEP=600 ENTERPRISE_PUSH=1 \
  pnpm run enterprise:driver:loop > /tmp/enterprise-2.0-logs/driver-loop.log 2>&1 &
```

Gdy agent ustawi `phase: GATE`, driver sam odpali smokes i przesunie do RELEASE.

## Komendy

| Komenda | Znaczenie |
|---------|-----------|
| `pnpm run enterprise:prompt` | regeneruj NEXT_AGENT_PROMPT |
| `pnpm run enterprise:step` | tick (gate auto / handoff) |
| `pnpm run enterprise:autonomous` | driver once |
| `pnpm run enterprise:driver:loop` | pętla driver |
| `pnpm run enterprise:loop` | pętla run-automation |
| `pnpm run enterprise:gate` | tylko bramki |
| `pnpm run enterprise:advance -- success` | ręcznie faza+1 |
| `pnpm run enterprise:status` | skrót STATUS |
| `pnpm run enterprise:install` | workflows + emit |

## Stany

```
READY + DESIGN|IMPLEMENT|RELEASE → agent (NEXT_AGENT_PROMPT)
READY + GATE                     → driver gate-check auto
BLOCKED                          → agent fix → advance success
DONE                             → enterprise-2.0.0
```

## Bezpieczeństwo

- Brak `filter-repo` bez `APPROVED_BY_USER_A=true` w STATUS
- DR live tylko `COMPOSE_PROJECT_NAME=erp-pilot-dr`
- Brak force-push master (tylko merge PR)
- Tenancy: `DEDICATED_STACK` (domyślnie)

## Exit codes (driver/step)

| Code | Meaning |
|------|---------|
| 0 | OK / DONE / GATE pass |
| 1 | GATE fail |
| 2 | BLOCKED |
| 10 | Agent work needed (DESIGN/IMPLEMENT/RELEASE) |
