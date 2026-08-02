# On-call runbook (Enterprise 2.1 P1)

## Severity

| Level | Meaning | First response |
|-------|---------|----------------|
| critical | Gateway down / money path broken | Page; restore gateway |
| warning | Scrape absent / SLO burn | Investigate within hours |

## Page → fix (gateway)

1. `pnpm run health:matrix`
2. Logs: `/tmp/enterprise-2.1-logs/gateway.log` or `/tmp/pilot-v1-complete-logs/gateway.log`
3. Restart: `bash scripts/boot-enterprise.sh` (or only gateway)
4. Confirm: `curl -sf http://127.0.0.1:4005/api/health` and `/api/metrics`
5. Grafana: dashboard **Enterprise Core SLO** (`erp-enterprise-core-slo`)

## Common failures

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| `/api/health` 000 | process dead / port bind | boot-enterprise; check EADDRINUSE |
| analytics 500 via proxy | analytics down | start analytics with ANALYTICS_NATS_DISABLE |
| finance 500 | missing dist/main.js | `pnpm run build:finance` then node dist/main.js |
| outbox PENDING | relay down / prisma client | regenerate prisma; restart service |
| Prometheus ErpGatewayScrapeAbsent | host.docker.internal / scrape path | check prometheus.yml job erp-api-gateway |

## Alerts (repo)

- `infra/prometheus/alerts/enterprise-core.yml` — ErpGatewayDown, ErpGatewayScrapeAbsent  
- `infra/prometheus/alerts/slo-burn-rate.yml` — BI snapshot burn (legacy)

## Escalation

- Domain money path: finance + saga owners  
- Security secrets: do not paste keys in chat; use SECRETS-CONTRACT  

## Related

- `docs/enterprise-2.0/SLO-MATRIX.md`  
- `docs/ENTERPRISE-2.1-P1-OBS-DESIGN.md`  
- `scripts/health-matrix.sh`  
