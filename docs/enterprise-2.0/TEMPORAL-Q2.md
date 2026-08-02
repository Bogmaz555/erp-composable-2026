# Temporal / G-lite — Enterprise Q2

## Decision (KD-Q2-3)

- **Preferred:** Temporal worker (`apps/temporal-worker`) for durable ETO compensation and KSeF/revenue.
- **Fallback:** G-lite orchestrator + `fallback-runner.ts` when `TEMPORAL_ADDRESS` unset.
- **Gate:** does **not** require live Temporal cluster. Unit tests + structure + existing saga compensation smoke.

## Workflows

| Workflow | Task queue | Steps |
|----------|------------|-------|
| `etoCompensationWorkflow` | `erp-eto-compensation` | reverse_wip, release_reservation, optional reverse_revenue |
| `ksefRevenueWorkflow` | `erp-ksef-revenue` | send_ksef, recognize_revenue |

## Env

| Variable | Default | Notes |
|----------|---------|-------|
| `TEMPORAL_ADDRESS` | unset | e.g. `localhost:7233` |
| `TEMPORAL_HOST` / `TEMPORAL_PORT` | 127.0.0.1 / 7233 | used if ADDRESS unset but HOST set |
| `TEMPORAL_NAMESPACE` | default | |

## Local

```bash
# optional — stack already may include erp-temporal
TEMPORAL_ADDRESS=localhost:7233 pnpm --filter @erp/temporal-worker start
pnpm --filter @erp/temporal-worker test
```

## Honesty

Pilot G-lite remains the live path for smoke:pilot / smoke-saga-compensation.
Temporal is enterprise structure + optional live; not readiness theater.
