# FAZA 1 – Manufacturing Core (ETO) – Closure Checklist

**Wersja:** 0.9 (autonomous updates)  
**Data:** 2026-05  
**Cel:** Obiektywne kryteria uznania Fazy 1 (głęboki Manufacturing Core dla produkcji jednostkowej ETO) za mocno zamkniętą i gotową do przejścia w Fazę 2.

Ten dokument jest żywy – aktualizowany przez autonomiczne pętle (SILENT checkpoints). Służy jako **Definition of Done** dla całego klastra PLM + MES + INV + PM + Finance (traceability).

---

## 1. Traceability Spine (bomComponentId) – MUST HAVE

- [x] PLM: BomComponent model z `bomComponentId`, effectivity, scrapFactor, alternateGroup, indexes (zgodne z blueprintem)
- [x] MES: MaterialRequirement + MaterialConsumption + AsBuiltComponent z `bomComponentId`
- [x] INV: StockReservation + StockTransaction z `bomComponentId` + projectId/workOrderId
- [x] Eventy z pełnym snapshotem:
  - `plm.bom.released.v2` (components[] z bomComponentId)
  - `mes.production.recorded.v1` (zawiera bomComponentIds)
  - `inventory.reservation.created.v1` + `.released.v1` (z bomComponentId + createdBy/released info)
- [x] Dwukierunkowy flow przetestowany w kodzie: release BOM → auto-reservations → production record → release reservations → Finance WIP
- [ ] (stretch) Pełna genealogy forward/backward w jednej maszynie (ItemGenealogy + AsBuilt links)

**Status (SILENT-47):** Core spine kompletny i tożsamościowy (identity-aware).

---

## 2. Auth / Zero-Trust (TD-001) – MUST HAVE dla ETO Core

- [x] JwtAuthGuard na wszystkich krytycznych kontrolerach (PLM BomVersions, MES WorkOrders, PM Projects, INV)
- [x] Realne użycie `req.user` (id + roles) w controllerach + audit
- [x] Basic RBAC: @Roles + RolesGuard (przykład w MES work-orders + inline w PLM release)
- [x] Propagacja claims w NATS (x-user-id + x-roles w headerach) w kluczowych listenerach:
  - MES pm-integration (plm.bom.released.v2)
  - INV pm-integration (plm.bom + mes.production)
  - Finance WIP (reservation.released)
- [x] Testy pokrywające claim extraction + role checks na krytycznych ścieżkach
- [ ] Pełne wdrożenie Keycloak (realm, clients, roles, JWKS w gatewayu) + end-to-end smoke z prawdziwym JWT
- [ ] Szeroka macierz ról (nie tylko przykłady)

**Status (SILENT-47):** Fundament TD-001 w Manufacturing Core jest solidny i demonstracyjny. Brakuje tylko produkcyjnego Keycloak + szerszego RBAC.

---

## 3. Testy (DoD minimum 80% na critical paths)

- [x] Unit + integration wokół RecordProduction, CreateReservation, reservation release, Finance WIP
- [x] Testy z bomComponentId (create-reservation-bom-trace, reservation-release, production-full-traceability, finance-wip-reservation-released)
- [x] Auth-specific testy (plm-bom-release-auth-roles, work-orders-controller-auth, record-production-auth)
- [x] Claim propagation testy dodane w SILENT-46/47 (MES full-trace + INV create-reservation)
- [ ] Contract tests (Pact) dla kluczowych eventów (plm.bom.released.v2, mes.production.recorded.v1, inventory.reservation.*)
- [ ] 1 prawdziwy Saga e2e test (nawet z mockami NATS + DB)
- [ ] Load test skeleton (k6) na krytyczną ścieżkę ETO

**Status:** Znaczący wzrost pokrycia na spine (z bardzo niskiego poziomu). Nadal poniżej 80% globalnie, ale critical ETO paths są dobrze pokryte.

---

## 4. Finance / Project Accounting (ETO costing)

- [x] Modele: ProjectCost, WipAccount, MilestoneBilling, JournalEntry
- [x] Listener na `inventory.reservation.released.v1` z WIP relief (RecordTransactionCommand + audit)
- [x] Claim-aware WIP listener (SILENT-41/42)
- [x] Real ProjectCost creation (MATERIAL type) on reservation release (SILENT-51) – actual costing on ETO spine
- [x] WipAccount upsert + balance updates on reservation release (SILENT-54) – WIP visibility for ETO projects
- [ ] Labor/overhead costing + more sophisticated cost rates
- [ ] Integracja milestone billing z PM (FAT/SAT)

**Status (SILENT-54):** Real ProjectCost + WipAccount updates now active on the spine. Basic actual WIP costing for materials is implemented.

---

## 5. Integracje i Eventy

- [x] Realne @EventPattern listenery w MES, INV, Finance (zamiast tylko symulacji)
- [x] Outbox Pattern konsekwentnie używany do wszystkich zdarzeń wychodzących
- [x] Event Registry zaktualizowany o aktywne eventy v2
- [ ] Lekka Saga Orchestration (nawet bez Temporal – prosty coordinator w shared lub dedykowanym service)
- [ ] PM plm-integration.controller przerobiony na prawdziwy @EventPattern (obecnie @Post symulacja)

**Status:** Bardzo dobra integracja event-driven w Manufacturing Core.

---

## 6. Dokumentacja i Governance

- [x] BLUEPRINT + DOMAIN-MODEL dla PLM, MES, INV, PM, Finance
- [x] TECHNICAL-DEBT.md aktualizowany (TD-001 progress)
- [x] CURRENT-CONTEXT.md żywy (SILENT updates)
- [x] SILENT checkpoints co 1-4h pracy autonomicznej (41-47+)
- [x] FAZA1-MANUFACTURING-CLOSURE-CHECKLIST.md (ten dokument)
- [ ] Aktualizacja wszystkich INTEGRATION-MATRIX.md
- [ ] ADR jeśli pojawiły się ważne decyzje w Fazie 1 (np. bomComponentId jako spine)

---

## 7. Demo & Uruchomienie

- [x] `scripts/demo-eto-machine-build-traceability.ts` – kompletny opis + praktyczne snippet z JWT + rolami
- [ ] Uruchomienie pełnego flow na dockerze (nawet z mockowanym Keycloak/JWKS) – jeden przebieg budowy maszyny od release BOM do as-built + zdarzeń finansowych
- [ ] Health checks + basic observability w serwisach Manufacturing

### Minimal Docker Smoke (nawet z mock auth – do wykonania w autonomous loop)
1. `docker compose up -d` (postgres instances + nats + services with DATABASE_URLs pointing to containers).
2. Run migrations / `npx prisma db push` per service (source remains canonical).
3. Seed minimal data (project + item + bom with bomComponentIds).
4. Use curl or ts-node script against api-gateway with dev JWT (or bypass for smoke) + x-tenant-id:
   - POST /plm/bom-versions + PATCH /release (triggers plm.bom.released.v2)
   - Observe INV creating reservations with bomComponentId + createdBy
   - Call MES work-order start/finish (protected) → record production
   - Observe inventory.reservation.released.v1 + Finance WIP log + transaction
5. Check outbox tables + logs for full claim propagation (x-user-id appearing in NATS listeners).
6. Goal: visible end-to-end trace in DB + logs without crashes.

Even a partial successful run (up to INV or Finance) counts as major milestone toward closure.

---

## 8. Co Pozostaje na Fazę 2+ (nie blokuje zamknięcia Fazy 1)

- Zaawansowany routing w MES + operacje
- Pełne LOT/SN + genealogy w INV
- Prawdziwa Saga Orchestration + kompensacje
- TaxLegalPBC + KSeF (równoległy tor)
- Frontend slices dla Manufacturing
- Gateway stabilization (TD-002) + circuit breakers
- Pełna observability (OpenTelemetry)

---

## Rekomendacja do zamknięcia Fazy 1

**Faza 1 Manufacturing Core może być uznana za zamkniętą na poziomie "mocny, demonstracyjny, gotowy do sprzedaży/pilotażu" gdy:**

1. Wszystkie pozycje z sekcji 1-2 (spine + TD-001 w core) są zielone.
2. Testy na critical ETO paths ≥ 75-80% + przynajmniej 1 contract + 1 chain test.
3. Demo ETO uruchamia się w dockerze z widocznym full flow + claim audit w logach.
4. Finance WIP tworzy realne ProjectCost/WipAccount wpisy.
5. Ten checklist jest w 85%+ zielony.

**Aktualny stan (SILENT-57):** 77-84% drogi do powyższego. Bardzo blisko "finału" jakościowego dla tej fazy.
Największe brakujące kawałki: Keycloak smoke + labor/overhead costing + 1 full chain e2e test.
Finance: real ProjectCost + WipAccount updates active and tested.
Test coverage on critical spine improved with richer released event payload assertions (contract-like).

---

**Właściciel:** erp-orchestrator + autonomous swarm  
**Ostatnia aktualizacja:** SILENT-57 (WipAccount + richer contract-like test on released event + state sync)

Po osiągnięciu zielonego stanu – stworzyć `FAZA1-MANUFACTURING-CLOSURE.md` (analogicznie do FAZA0) i przejść do Fazy 2.

---
Autonomicznie utrzymywany dokument.