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
- Gateway `*_SERVICE_URL` env must use **cluster Service DNS** (`http://pm-service:4002`), never `127.0.0.1` (see README Service DNS section)
- Images: build from `docker/Dockerfile.*` or root `Dockerfile` (gateway EXPOSE **4005**)
