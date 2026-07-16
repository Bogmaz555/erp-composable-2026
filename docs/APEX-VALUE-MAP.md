# APEX 2.0 → ERP Composable 2026 (mapa wartości inkrementalnej)

**Zasada:** wchłaniamy koncepcje z `Dane do analizy rozwojowej/`, **bez** fork struktury na `max-speed-erp`.

| Koncepcja APEX | Status | Gdzie w projekcie |
|----------------|--------|-------------------|
| Long-Lead Radar | ✅ W23 | `proc-service/long-lead-radar.*` |
| Universal Journal (lite) | ✅ W23 | `finance/universal-journal.*` |
| projectId + WBS na eventach | ✅ W23 | `shared-kernel/types/eto-operational.ts` |
| Zasady Cursor (NATS, bez JOIN) | ✅ W23 | `.cursor/rules/erp-eto-incremental.mdc` |
| Double BOM / CAD | ✅ W24 (Double BOM) / CAD odłożone | `plm-service/double-bom.*` |
| MCP / AI Swarm runtime | ⏳ później | po governance + audyt |
| WebXR / Vision QMS | ❌ odłożone | kiosk PWA wystarcza na demo |
| NestJS overrides (TD-010) | ✅ W32 | `pnpm.overrides` + `/platform/nestjs-versions` |
| Observability readiness | ✅ W34 | `/platform/observability/readiness` |
| Production readiness aggregate | ✅ W40/W43 | `/platform/production/readiness` (8 checks) |
| Gateway proxy readiness | ✅ W42 | `/platform/gateway/readiness` |
| ETO payload guards | ✅ W43 | `/platform/eto-payload/readiness` |
| Boot smart / FRONTEND_PORT | ✅ W38 | `pnpm run boot:smart` |
| Full stack readiness | ✅ W44 | `/platform/stack/readiness` + `ensure-core-stack.sh` |
| Tax / KSeF readiness | ✅ W45 | `/platform/tax/readiness` |
| Genealogy E2E UI spine | ✅ W46 | `/traceability/e2e/view` + INV tab |
| Auth readiness | ✅ W37 | `/platform/auth/readiness` |
| Genealogy E2E | ✅ W39 | `/traceability/e2e/readiness` |
| Osobny agent-orchestrator | ❌ nie | `.agents/` + analytics ETO |

*Aktualizuj przy kolejnych warstwach inkrementalnych.*
