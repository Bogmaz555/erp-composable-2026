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
PILOT=1 bash scripts/prisma-migrate-deploy.sh \
  inv-service proc-service pm-service finance plm-service mes-service
```

## Core services with full baselines (PR 10)

| Service | Baseline folder | Follow-up |
|---------|-----------------|-----------|
| inv-service | `20260801000000_baseline` | `20260801120000_outbox_processing` |
| proc-service | `20260801000000_baseline` | `20260801120000_outbox_processing` |
| pm-service | `20260801000000_baseline` | `20260801120000_outbox_processing` |
| finance | `20260801000000_baseline` | `20260801120000_outbox_processing` |
| plm-service | `20260801000000_baseline` | `20260801120000_outbox_processing` |
| mes-service | `20260801000000_baseline` | `20260801120000_outbox_processing` |

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
