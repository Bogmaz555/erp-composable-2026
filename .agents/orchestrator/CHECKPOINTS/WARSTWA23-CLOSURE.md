# Warstwa 23 — CLOSURE (APEX inkrementalnie)

**Zasada:** wartość z dokumentów APEX bez rewolucji strukturalnej (bez nowych mikroserwisów, MCP, WebXR).

## Deliverables

| ID | Cel | Status |
|----|-----|--------|
| W23-M01 | Long-Lead Radar (PROC) | ✅ |
| W23-M02 | Universal Journal lite (finance) | ✅ |
| W23-M03 | `assertEtoOperationalPayload` + contract test | ✅ |
| W23-M04 | `.cursor/rules/erp-eto-incremental.mdc` | ✅ |
| W23-M05 | `pipeline:warstwa23` + smoke + CI | ✅ |

## Naprawa operacyjna (W23+)

- Gateway: `@fastify/http-proxy` → `^9.5.0` (kompatybilne z Fastify 4 / Nest 10 overrides)
- Pipeline W23: health gateway `/api/health`, `nest-build-all` przed startem finance

## Komendy weryfikacji

```bash
pnpm run build:all:nest
pnpm run test:contracts          # 11/11 (+ eto-operational-payload)
pnpm run pipeline:warstwa23
pnpm run smoke:long-lead
pnpm run smoke:universal-journal
```

Live regression (wymaga `pnpm run boot:all` lub docker stack): **37/37** target.

## Świadomie odłożone

Double BOM, MCP runtime, AI swarm, WebXR, pełny Zero Trust — patrz `docs/APEX-VALUE-MAP.md`.
