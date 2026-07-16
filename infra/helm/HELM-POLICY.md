# Helm Deploy Policy (W135)

## Scope

Helm chart `infra/helm/erp/` packages core ERP services for Kubernetes deployment.

## Environments

| File | Namespace | Use |
|------|-----------|-----|
| `values.yaml` | erp | Default |
| `values-dev.yaml` | erp-dev | Local/dev cluster |
| `values-staging.yaml` | erp-staging | Pre-prod |
| `values-prod.yaml` | erp-prod | Production |

## Commands

```bash
helm template erp infra/helm/erp/ -f infra/helm/erp/values-dev.yaml
helm lint infra/helm/erp/
bash scripts/ensure-helm-deploy-ready.sh
```

## CI Gate

Set `CI_HELM_DEPLOY=true` to enforce probe `scripts/ci-helm-deploy-probe.ts`.
