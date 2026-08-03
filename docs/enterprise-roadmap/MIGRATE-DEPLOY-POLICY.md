# Prisma migrate policy (E1)

| Environment | Allowed | Forbidden |
|-------------|---------|-----------|
| Local dev | `prisma db push`, `migrate dev` | committing secrets |
| CI | `db push` for ephemeral DBs / baselines | production credentials |
| Staging/Prod | **`prisma migrate deploy` only** | `db push`, `migrate reset` |

Each service keeps migrations under `apps/<svc>/prisma/migrations/`.  
Baseline empty DBs with ordered migrations before first deploy.

Rollback: restore DB from backup (DR runbook), then re-deploy previous image tag.
