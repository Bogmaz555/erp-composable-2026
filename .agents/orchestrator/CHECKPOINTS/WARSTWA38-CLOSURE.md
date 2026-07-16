# WARSTWA38 — CLOSURE

**Data:** 2026-06-06 | **TD-011** Boot dev UX

- `boot-all-smart.sh` — ulimit, FRONTEND_PORT auto, skip if gateway up
- `resolve-frontend-port.sh` + `/tmp/erp-frontend.port`
- `GET /api/analytics/platform/boot/readiness`
- Regression FE detect (ERP only, skip Open WebUI :3000)
- Regression: 55/55
