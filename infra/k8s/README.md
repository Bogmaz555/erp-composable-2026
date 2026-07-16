# Kubernetes — Health Probes & Deployment Reference

Każdy serwis eksponuje:
- **liveness:** `GET /health` → `200 { status: "ok", service }`
- **readiness:** `GET /health/ready` → ping DB (`SELECT 1`); `degraded` gdy DB down

> Gateway: liveness na `/` (proxy). Analytics: `/api/analytics/health` (publiczne nawet przy `AUTH_ENFORCE`).

## Porty serwisów

| Serwis | Port | liveness | readiness |
|--------|------|----------|-----------|
| api-gateway | 4005 | `/` | — |
| crm-service | 4001 | `/crm/health`* | — |
| pm-service | 4002 | `/health`* | — |
| inv-service | 4003 | `/health` | `/health/ready` |
| proc-service | 4004 | `/health` | `/health/ready` |
| mes-service | 4006 | `/health` | `/health/ready` |
| plm-service | 4007 | `/health` | `/health/ready` |
| quality-service | 4008 | `/health` | `/health/ready` |
| eam-service | 4009 | `/health` | `/health/ready` |
| finance | 4010 | `/fin/health`* | — |
| analytics-service | 4011 | `/health` | — |
| hr | 4012 | `/hr/health`* | — |
| tax-legal | 4015 | `/tax-legal/health`* | — |

\* serwisy z wcześniejszych faz mają health w kontrolerze domenowym; nowe (SILENT-78) mają dedykowany `HealthController`.

## Przykładowy Deployment (readiness/liveness)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: proc-service
spec:
  replicas: 2
  selector:
    matchLabels: { app: proc-service }
  template:
    metadata:
      labels: { app: proc-service }
    spec:
      containers:
        - name: proc-service
          image: erp/proc-service:latest
          ports: [{ containerPort: 4004 }]
          env:
            - name: PROC_DATABASE_URL
              valueFrom: { secretKeyRef: { name: proc-db, key: url } }
            - name: NATS_URL
              value: nats://nats:4222
            - name: AUTH_ENFORCE
              value: "true"
            - name: OUTBOX_MAX_ATTEMPTS
              value: "5"
          livenessProbe:
            httpGet: { path: /health, port: 4004 }
            initialDelaySeconds: 10
            periodSeconds: 15
          readinessProbe:
            httpGet: { path: /health/ready, port: 4004 }
            initialDelaySeconds: 5
            periodSeconds: 10
```

## Migracje przed rolloutem

initContainer / Job uruchamiający:

```bash
npm run db:migrate:deploy        # wszystkie serwisy
# lub pojedynczo:
bash scripts/prisma-migrate-deploy.sh proc-service
```
