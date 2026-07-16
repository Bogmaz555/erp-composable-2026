# Kubernetes Deployment Policy (W131)

## Scope

Dev/staging manifests under `infra/k8s/deploy/`:
- `namespace.yaml` — `erp` namespace
- `api-gateway.yaml` — gateway Deployment + Service
- `analytics-service.yaml` — analytics Deployment + Service
- `kustomization.yaml` — Kustomize entrypoint

## Apply

```bash
bash scripts/ensure-k8s-deploy-ready.sh
kubectl apply -k infra/k8s/deploy/
```

## Prerequisites

- Health probes per `infra/k8s/README.md`
- Secrets: DB URLs, NATS, JWT (Vault KV in prod)
