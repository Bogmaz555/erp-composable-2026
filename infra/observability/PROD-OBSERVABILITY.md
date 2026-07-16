# Production Observability Profile (W127)

Full stack: Prometheus + Alertmanager + Grafana + Vault

```bash
docker compose --profile prod-observability up -d prometheus alertmanager grafana vault vault-ha
bash scripts/ensure-prod-observability-ready.sh
```

Services: `:9090` Prometheus, `:9093` Alertmanager, `:3000` Grafana, `:8200` Vault, `:8201` Vault HA stub.
