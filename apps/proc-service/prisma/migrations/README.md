# Prisma migrations (proc-service)

## History

| Folder | Role |
|--------|------|
| `20260801000000_baseline` | Full schema from `schema.prisma` (`migrate diff --from-empty`) |
| `20260801120000_outbox_processing` | Additive outbox `PROCESSING` + attempts/lastError (idempotent) |

`migration_lock.toml` — `provider = "postgresql"`.

## Deploy behavior

`scripts/prisma-migrate-deploy.sh` detects the **baseline** and runs:

```text
prisma migrate deploy
```

only (no `db push`). Under `PILOT=1`, deploy is followed by a schema drift check.

```bash
PILOT=1 bash scripts/prisma-migrate-deploy.sh proc-service
```

## Existing DBs (prior `db push`)

Do **not** re-run baseline SQL on databases that already have tables. After backup
and parity check, mark history applied:

```bash
npx prisma@5.22.0 migrate resolve --applied 20260801000000_baseline \
  --schema apps/proc-service/prisma/schema.prisma
npx prisma@5.22.0 migrate resolve --applied 20260801120000_outbox_processing \
  --schema apps/proc-service/prisma/schema.prisma
```

Full procedure: **[docs/PRISMA-MIGRATIONS.md](../../../../docs/PRISMA-MIGRATIONS.md)**.

## Regenerating the baseline

Only safe **before** the baseline is applied in any shared environment:

```bash
npx prisma@5.22.0 migrate diff \
  --from-empty \
  --to-schema-datamodel apps/proc-service/prisma/schema.prisma \
  --script > apps/proc-service/prisma/migrations/20260801000000_baseline/migration.sql
```

After baseline is live, ship schema changes as **new** timestamped migrations.
