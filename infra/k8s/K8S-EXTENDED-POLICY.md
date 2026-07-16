# K8s Extended Deploy Policy (W139)

Rozszerzenie `infra/k8s/deploy/` o pozostałe serwisy domenowe:

| Manifest | Port | Service |
|----------|------|---------|
| pm-service.yaml | 4002 | PM |
| proc-service.yaml | 4004 | Procurement |
| plm-service.yaml | 4007 | PLM |
| finance-service.yaml | 4010 | Finance |
| quality-service.yaml | 4008 | Quality |
| eam-service.yaml | 4009 | EAM |

## CI Gate

`CI_K8S_EXTENDED=true` → `scripts/ci-k8s-extended-probe.ts`
