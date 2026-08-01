# Prisma migrations — pilot baseline strategy

## Overview

Each service owns its database (database-per-service). Schema source of truth is
**`apps/<svc>/prisma/schema.prisma`**, not a live `db pull`.

| Path | When | Deploy command |
|------|------|----------------|
| **Baseline + follow-ups** | Core pilot services (PR 10) | `prisma migrate deploy` only |
| **Thin / outbox-only** | Non-core or pre-baseline | `db push` then `migrate deploy` |
| **No migrations dir** | Dev-only / new service | `db push` (forbidden under `PILOT=1`) |

Runner: **`scripts/prisma-migrate-deploy.sh`** (`pnpm run db:migrate:deploy`).

```bash
# All services (dev: may push where needed)
pnpm run db:migrate:deploy

# Core pilot services — migrate deploy only, schema verify
# Prefer the package script (already scoped to the core six):
pnpm run db:migrate:deploy:pilot
# equivalent:
PILOT=1 bash scripts/prisma-migrate-deploy.sh \
  inv-service proc-service pm-service finance plm-service mes-service
```

### Unscoped `PILOT=1` fails non-core **by design**

`scripts/prisma-migrate-deploy.sh` with **no service arguments** targets
`ALL_SERVICES` (core + quality, hr, tax-legal, crm, eam, analytics, …).

Under `PILOT=1` that unscoped run **will fail** on every service that still has
only thin/outbox migrations or no migrations dir. That is intentional pilot
purity — not a bug:

| Invocation | Expected |
|------------|----------|
| `PILOT=1 pnpm run db:migrate:deploy:pilot` | OK path for pilot (core six only) |
| `PILOT=1 bash scripts/prisma-migrate-deploy.sh inv-service … mes-service` | Same — explicit core list |
| `PILOT=1 bash scripts/prisma-migrate-deploy.sh` (no args) | **Fails** on non-core until those services get baselines |
| `pnpm run db:migrate:deploy` (no PILOT) | Dev: thin → push+deploy; missing dir → push |

Non-core remain thin/outbox or push-only until a later baseline PR. Do not run
unscoped `PILOT=1` in pilot/CI rollouts; use `db:migrate:deploy:pilot` or an
explicit service list.

## Core services with full baselines (PR 10)

| Service | Baseline folder | Follow-up |
|---------|-----------------|-----------|
| inv-service | `20260801000000_baseline` | `20260801120000_outbox_processing` |
| proc-service | `20260801000000_baseline` | outbox + `20260801200000_decimal_money` (PR 11) |
| pm-service | `20260801000000_baseline` | outbox + `20260801200000_decimal_money` (PR 11) |
| finance | `20260801000000_baseline` | `20260801120000_outbox_processing` (amounts already Decimal) |
| plm-service | `20260801000000_baseline` | `20260801120000_outbox_processing` |
| mes-service | `20260801000000_baseline` | `20260801120000_outbox_processing` |

### Money Decimal (PR 11 / KD-5 blocklist)

Pilot-critical monetary fields are **Prisma `Decimal`** (Postgres `DECIMAL(65,30)`):

| Service | Fields | Migration path |
|---------|--------|----------------|
| finance | `amount`, `balance`, `wip*`, … | Already Decimal in baseline |
| proc-service | `unitPrice`, `freightCost`, `customsDuty`, `landedUnitCost` | `20260801200000_decimal_money` |
| pm-service | `budget`, `targetRevenue`, `baselineCost`, `actualLaborCost` | `20260801200000_decimal_money` |
| hr | `hourlyRate` | Schema + `db push` (thin migrations only) |
| tax-legal | `TaxInvoice.amount` | Schema + `db push` (thin migrations only) |

**Not converted (by design):** engineering qty (`ItemGenealogy.quantityUsed`, BOM qty),
`weightKg`/`scrapFactor`, timesheet `hours`, FTE `units`, `ccpmBufferPct`, CRM prices
(secondary → optional PR 12).

Gate (no DB): `pnpm run check:no-float-money` → `scripts/check-no-float-money.sh`.

Baselines were generated with:

```bash
npx prisma@5.22.0 migrate diff \
  --from-empty \
  --to-schema-datamodel apps/<svc>/prisma/schema.prisma \
  --script
```

Do **not** invent SQL by hand or use silent `db pull` as the baseline source.
Regenerate from `schema.prisma` if the model changes before the baseline has been
applied in any shared environment.

Outbox follow-up SQL is **additive / idempotent** (`IF NOT EXISTS` / exception
guards) so it is a no-op on greenfield after the full baseline.

## `PILOT=1` rules

When `PILOT=1`:

1. **No pure push-only** — services without `prisma/migrations` fail.
2. **No thin push fallback** — outbox-only trees fail; add a baseline first.
3. **After `migrate deploy`** — `migrate diff` datamodel ↔ datasource must show
   **no drift** (exit code 0). Connectivity / missing `*_DATABASE_URL` also fails.
4. **Scope matters** — unscoped runs iterate all services and therefore fail
   non-core by design (see above). Always pass the core list or use
   `pnpm run db:migrate:deploy:pilot`.

Dev / non-pilot still allows thin `push` → `deploy` for services without baselines
(quality, hr, tax-legal, crm, etc.).

## Existing DBs (created via historical `db push`)

Greenfield empty DBs: just run migrate deploy (baseline applies full schema).

**Existing demo / push-created databases** already have tables but no (or partial)
`_prisma_migrations` history. Applying the baseline SQL would fail with
“already exists”. Baselining procedure:

1. **Backup** the database.
2. **Parity check** — schema must match current `schema.prisma`:

   ```bash
   npx prisma@5.22.0 migrate diff \
     --from-schema-datamodel apps/<svc>/prisma/schema.prisma \
     --to-schema-datasource apps/<svc>/prisma/schema.prisma \
     --script
   # empty / no DDL ⇒ in sync; otherwise fix drift before resolving
   ```

3. **Mark migrations applied** without re-running SQL (order matters: baseline first):

   ```bash
   export <SVC>_DATABASE_URL=postgresql://...
   npx prisma@5.22.0 migrate resolve \
     --applied 20260801000000_baseline \
     --schema apps/<svc>/prisma/schema.prisma
   npx prisma@5.22.0 migrate resolve \
     --applied 20260801120000_outbox_processing \
     --schema apps/<svc>/prisma/schema.prisma
   ```

4. **Verify**:

   ```bash
   PILOT=1 bash scripts/prisma-migrate-deploy.sh <svc>
   ```

If only the outbox migration was already recorded (PR 4 path) and the DB has the
full schema from push, resolve **only** the missing baseline:

```bash
npx prisma@5.22.0 migrate resolve \
  --applied 20260801000000_baseline \
  --schema apps/<svc>/prisma/schema.prisma
```

Prisma will still try to apply any later unapplied folders; outbox is already in
history so it is skipped.

## Adding a new baseline (non-core service)

```bash
svc=quality-service
mkdir -p apps/$svc/prisma/migrations/20260801000000_baseline
npx prisma@5.22.0 migrate diff \
  --from-empty \
  --to-schema-datamodel apps/$svc/prisma/schema.prisma \
  --script > apps/$svc/prisma/migrations/20260801000000_baseline/migration.sql
# ensure migration_lock.toml exists (provider = "postgresql")
# update apps/$svc/prisma/migrations/README.md
```

Keep timestamps **before** additive follow-ups so greenfield order is baseline → deltas.

## Env URLs (per service)

| Service | Env var |
|---------|---------|
| inv-service | `INVENTORY_DATABASE_URL` |
| proc-service | `PROC_DATABASE_URL` |
| pm-service | `PM_DATABASE_URL` |
| finance | `FINANCE_DATABASE_URL` |
| plm-service | `PLM_DATABASE_URL` |
| mes-service | `MES_DATABASE_URL` |

## Related

- PR 4 — thin outbox migrations (`PROCESSING`, `attempts`, `lastError`)
- `scripts/prisma-migrate-deploy.sh`
- `infra/k8s/README.md` — run migrate before rollout
