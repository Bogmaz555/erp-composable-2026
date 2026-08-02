# Domain depth ops (P3)

## Live hard gates
```bash
REQUIRE_LIVE=1 REQUIRE_LIVE_STRICT=1 pnpm run smoke:pilot
REQUIRE_LIVE=1 REQUIRE_LIVE_STRICT=1 npx tsx scripts/smoke-saga-compensation.ts
```

## Multi-replica outbox
- Relay uses `lockedAt` (Q0). Run 2 inv-service instances only with reclaim configured.
- Env: `OUTBOX_RECLAIM_MINUTES`, `OUTBOX_MAX_ATTEMPTS`.

## KSeF
- Staging: `KSEF_MODE=sandbox`
- Prod: `KSEF_MODE=production` + secrets (fail-closed) — see KSEF-RUNBOOK.md

## Temporal
- Worker: `apps/temporal-worker` (Q2). G-lite remains fallback if TEMPORAL_ADDRESS unset.
- Residual TD-003 until Temporal is mandatory in prod values.
