# SLO Matrix (Enterprise Q5)

| Service | SLI | Target | Evidence |
|---------|-----|--------|----------|
| api-gateway | availability /api/health | 99.5% | Prometheus scrape + smoke |
| pm-service | p95 HTTP | < 500ms pilot | metrics if exposed |
| inv-service | p95 reserve path | < 800ms | smoke outbox |
| finance | p95 journal | < 800ms | smoke |
| mes-service | p95 WO | < 800ms | smoke |
| NATS JetStream | publish ack success | 99.9% | smoke-jetstream |

Burn-rate alerts: see `infra/grafana` / existing SLO contracts when present.
Honesty: pilot stack may not export full Prom metrics for all services — table is contract for GA ops.
