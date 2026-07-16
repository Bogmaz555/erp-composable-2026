# Quality/EAM Production Policy (W137)

## Scope

Production-grade NCR/CAPA and EAM status endpoints for smoke, regression, and readiness gates.

## Endpoints

| Service | Path | Purpose |
|---------|------|---------|
| quality-service | `GET /ncr-capa/production` | ISO 9001 oriented NCR/CAPA aggregate |
| eam-service | `GET /eam/production/status` | Maintenance + IoT production readiness |

## CI Gate

Set `CI_QUALITY_EAM_PROD=true` to enforce `scripts/ci-quality-eam-prod-probe.ts`.
