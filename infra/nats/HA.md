# NATS / JetStream HA path (Enterprise Q3)

## Single-node (pilot / default compose)

- Container: `erp-nats` with JetStream enabled (`infra/nats/nats.conf`)
- Acceptable for pilot and Q0–Q2 gates
- Residual: no automatic failover

## Enterprise HA path (documented)

### Option A — 3-node JetStream cluster (recommended)

1. Three NATS servers with shared cluster routes and JetStream domain.
2. Clients use comma-separated `NATS_URL=nats://nats-0:4222,nats://nats-1:4222,nats://nats-2:4222`.
3. Streams replicated (`num_replicas: 3` where supported).
4. Optional compose: `docker-compose.nats-ha.yml` (if present) or k8s StatefulSet.

### Option B — Managed NATS / Synadia Cloud

Use vendor multi-AZ endpoints; same client URL list pattern.

## Verification

```bash
curl -sf http://127.0.0.1:8222/healthz
curl -sf http://127.0.0.1:8222/jsz | head
bash scripts/nats-bootstrap-streams.sh
```

## Honesty

Q3 GATE does **not** require three live nodes in CI. Presence of this runbook + single-node JetStream green is the minimum; multi-node is ops enablement.
