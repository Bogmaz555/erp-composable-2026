# Warstwa 25 — CLOSURE (Auth & Gateway → 🟡)

| ID | Cel | Status |
|----|-----|--------|
| W25-M01 | Gateway `/api/health` w W22 restart_if_down | ✅ |
| W25-M02 | `pipeline:warstwa25` + auth/rbac smoke | ✅ |
| W25-M03 | TD-001/TD-002 → 🟡 w TECHNICAL-DEBT + PRODUCTION-READINESS | ✅ |
| W25-M04 | Gateway proxy smoke (plm/boms via GW) | ✅ |
| W25-M05 | Checkpoint + roadmap W26 | ✅ |

⛔ pozostaje: Vault, TLS/mTLS, pełny prod AUTH rollout — wymaga infry.

```bash
pnpm run pipeline:warstwa25
pnpm run smoke:auth-enforce
```
