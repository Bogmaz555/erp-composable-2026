# Warstwa 24 — CLOSURE

**Zasada:** inkrementalnie, bez rewolucji strukturalnej.

| ID | Cel | Status |
|----|-----|--------|
| W24-M01 | Double BOM w PLM (`subBomVersionId`, explosion, `GET /double-bom`) | ✅ |
| W24-M02 | `assertEtoOperationalPayload` w PM/INV handlerach | ✅ |
| W24-M03 | Panel Long-Lead w `MrpPanel.tsx` | ✅ |
| W24-M04 | Regression +1 endpoint (`PLM boms`) | ✅ |
| W24-M05 | `pipeline:warstwa24` + contract test double-bom | ✅ |

## Kluczowe pliki

- `apps/plm-service/src/double-bom.service.ts`
- `apps/plm-service/prisma/schema.prisma` — `BomComponent.subBomVersionId`
- `apps/pm-service/src/plm-integration.controller.ts` — payload guard
- `apps/inv-service/src/pm-integration.controller.ts` — material/bom/production guards
- `apps/frontend/app/proc/MrpPanel.tsx` — Long-Lead Radar UI
- `scripts/autonomous-warstwa24-pipeline.sh`

## Weryfikacja

```bash
pnpm run test:contracts      # 12/12
pnpm run smoke:double-bom
pnpm run pipeline:warstwa24
```

Live regression target: **38/38** (wymaga `pnpm run boot:all`).
