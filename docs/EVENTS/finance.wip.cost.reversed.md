# finance.wip.cost.reversed

**Status:** Active (Pilot G-lite / PR16)  
**Emitowany przez:** analytics-service `EtoOrchestratorService` (on step FAIL / timeout), `EtoChainService.compensate`  
**Konsumenci:** finance-service (`ReverseWipCostHandler` via `@EventPattern` or JetStream `fin-wip-worker`)

---

## Opis

Kompensacja WIP w torze ETO (Saga G-lite). Publikowana gdy orchestrator oznacza job jako FAILED (max attempts / step timeout) albo gdy API wywołuje compensate. Handler zeruje `WipAccount`, tworzy `ProjectCost` typu `REVERSAL` z `reference=correlationId` oraz księguje CREDIT na koncie GL `130-WIP`.

**Idempotencja:** drugi event z tym samym `correlationId` jest no-op (istniejący REVERSAL / journal `SAGA_COMPENSATION`).

**Temporal:** nie jest wymagany do tego eventu — most Temporal jest non-DoD (KD-4).

---

## Payload (frozen)

```json
{
  "correlationId": "orch-…",
  "projectId": "proj-…",
  "tenantId": "default",
  "compensate": true,
  "compensatedStep": "finance.wip.cost.recorded",
  "source": "eto-saga-orchestrator",
  "publishedAt": "ISO-8601"
}
```

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `correlationId` | string | tak | Klucz idempotencji + ślad sagi |
| `projectId` | string | tak | Projekt ETO (real id, nie hardcode) |
| `tenantId` | string | tak | Tenant (default: `default`) |
| `compensate` | boolean | tak | Zawsze `true` |
| `compensatedStep` | string | nie | Krok workflow, który failował |
| `source` | string | nie | `eto-saga-orchestrator` / `eto-chain` |
| `publishedAt` | string | nie | Timestamp publish |

---

## Kompensacja in-scope (pilot)

| Kontekst | Event | Handler |
|----------|-------|---------|
| After WIP / orchestrator fail | `finance.wip.cost.reversed` | `ReverseWipCostHandler` |

Out-of-scope: pełny reverse BOM / MES production reverse (residual).
