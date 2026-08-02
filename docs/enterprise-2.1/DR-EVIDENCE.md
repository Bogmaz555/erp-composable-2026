# DR evidence log (Enterprise 2.1 P2)

| Date | Mode | Project | Backup dir | RTO | Notes |
|------|------|---------|------------|-----|-------|
| 2026-08-02 | DRY-RUN | erp-pilot-dr | ./backups/* | <2h target | dr-drill.sh dry-run via Q5/P2 gates |

**Live drill:** only with `COMPOSE_PROJECT_NAME=erp-pilot-dr DR_DRILL_DRY_RUN=0` and operator approval.
**RPO target:** ≤24h dumps | **RTO target:** ≤2h (see DR-RPO-RTO.md)
