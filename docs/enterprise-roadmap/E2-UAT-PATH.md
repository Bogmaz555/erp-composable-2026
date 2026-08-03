# E2 UAT path (ETO week)

Operator checklist (dedicated stack, logged in as `demo.admin` / `demo123`):

| # | Step | UI / API | Pass criteria |
|---|------|----------|---------------|
| 1 | Login | `/` Zaloguj | displayName set |
| 2 | CRM list | `/crm` | opportunities load (Bearer) |
| 3 | Create lead | New Lead drawer | 201 / row visible |
| 4 | PM projects | `/pm` | projects list |
| 5 | PROC POs | `/proc` | orders list, not 401 |
| 6 | INV stock | `/inv` | inventory via gateway |
| 7 | MES WOs | `/mes` | work orders |
| 8 | FIN WIP | `/finance` | WIP/journal reachable |
| 9 | ETO week | `/eto-week` | page 200 |
| 10 | Smoke | `pnpm run smoke:pilot:eto` | green with stack up |

**Residual:** full 12/12 automated e2e may still require stack boot in CI; this is the human path.
