# Prisma migrations (outbox thin history)

This directory currently contains **thin/outbox-only** migrations — not a full
service schema baseline.

## Deploy behavior

`scripts/prisma-migrate-deploy.sh` detects thin-only migration trees and:

1. Runs **`prisma db push`** so the full service schema materializes on empty DBs
2. Then runs **`prisma migrate deploy`** to apply/record these additive outbox SQL files

Once a true baseline/`init` migration is added, the script uses **migrate deploy only**.

## Outbox migration intent

- Add `OutboxStatus.PROCESSING` (ordered after `PENDING` when newly added)
- Ensure `attempts` / `lastError` columns exist
- Optionally bootstrap `OutboxStatus` + `OutboxEvent` if missing

SQL uses `IF NOT EXISTS` / exception guards so it is **additive on DBs that already
have OutboxEvent/OutboxStatus** (e.g. prior `db push`). It is **not** a full
schema bootstrap for the whole service — that remains `db push` / future baseline.
