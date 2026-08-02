# DR RPO/RTO (Enterprise Q5)

| Metric | Target | Mechanism |
|--------|--------|-----------|
| RPO | ≤ 24h (pilot); ≤ 1h enterprise goal | Postgres backups `scripts/backup-dbs.sh` |
| RTO | ≤ 4h pilot; ≤ 1h enterprise goal | `scripts/restore-dbs.sh` + `dr-drill.sh` |

**Live DR** only with `COMPOSE_PROJECT_NAME=erp-pilot-dr`.  
Gate uses `DR_DRILL_DRY_RUN=1` by default.
