# ERP Composable 2026 – GOVERNANCE (Konstytucja Projektu)

**Wersja:** 1.0  
**Data:** 2026-04  
**Status:** Obowiązujący

---

## 1. Cel tego dokumentu

Ten dokument jest **najwyższym prawem** projektu. Każdy agent (człowiek lub AI) **musi** go przeczytać i przestrzegać przed rozpoczęciem jakiejkolwiek pracy nad kodem lub dokumentacją.

Celem jest:
- Zachowanie kontekstu projektu na lata (nawet przy rotacji agentów)
- Zapewnienie spójności architektury mimo pracy równoległej wielu agentów
- Umożliwienie długotrwałej, autonomicznej pracy agentów bez ciągłego pytania o decyzje
- Ochrona przed długiem technicznym i "zapominaniem" decyzji

---

## 2. Obowiązkowe Pliki Kontekstowe (Context Injection Rule)

**ZASADA ABSOLUTNA:** Przed dotknięciem jakiegokolwiek pliku w module X, agent **musi** wczytać następujące dokumenty (w tej kolejności):

### 2.1 Zawsze (globalnie)
1. `docs/GOVERNANCE.md` (ten plik)
2. `docs/BUSINESS-CONTEXT.md`
3. `specs/ERP_Architecture.md`
4. `specs/ERP_Best_Practices_and_Standards.md`
5. `.agents/orchestrator/CURRENT-CONTEXT.md`

### 2.2 Dla konkretnego modułu (Bounded Context)
1. `docs/MODULES/{kod-modulu}/BLUEPRINT.md`
2. `docs/MODULES/{kod-modulu}/DOMAIN-MODEL.md`
3. `docs/MODULES/{kod-modulu}/INTEGRATION-MATRIX.md`
4. Wszystkie eventy z `docs/EVENTS/` które ten moduł emituje lub konsumuje

### 2.3 Przed zmianą eventu lub kontraktu
- Odpowiedni plik w `docs/EVENTS/`
- `docs/STANDARDS/event-versioning.md`

**Naruszenie tej zasady = natychmiastowe przerwanie pracy przez erp-guardian.**

---

## 3. Definition of Done (DoD) – Moduł / Funkcja

Żaden moduł ani większa funkcjonalność **nie jest ukończona**, dopóki nie spełnia wszystkich poniższych punktów:

### Backend (NestJS + CQRS)
- [ ] Model Prisma kompletny i znormalizowany (bez JSON-ów tam gdzie powinny być relacje)
- [ ] Pełny zestaw Command + Query + Event handlers (CQRS)
- [ ] Outbox Pattern dla wszystkich zdarzeń wychodzących (jeśli moduł emituje)
- [ ] Eventy zdefiniowane w `docs/EVENTS/` + wersja
- [ ] Minimum 80% pokrycia testami jednostkowymi + integracyjnymi (cel 90%+)
- [ ] Contract tests (Pact) dla emitowanych/konsumowanych eventów
- [ ] Health endpoint + podstawowa observability (tracing)

### Frontend (Next.js 15)
- [ ] Pełny widok/sekcja w istniejącym stylu glassmorphism (Tailwind + istniejące hooki)
- [ ] Użycie TanStack Query + memoizacja (useMemo/useCallback gdzie potrzeba)
- [ ] Brak `window.location.reload()`
- [ ] Integracja z API Gateway (nie bezpośrednie porty w finalnej wersji)

### Integracja i Architektura
- [ ] Zarejestrowany w API Gateway (spójny sposób proxy)
- [ ] Zdefiniowane i udokumentowane integracje z innymi modułami (Saga lub eventy)
- [ ] Brak bezpośrednich zapytań do bazy innych serwisów

### Dokumentacja
- [ ] BLUEPRINT.md, DOMAIN-MODEL.md i INTEGRATION-MATRIX.md w `docs/MODULES/{kod}/` są aktualne
- [ ] ADR jeśli podjęto ważną decyzję architektoniczną
- [ ] Eventy dodane do Event Catalog

### Compliance & Bezpieczeństwo (dla modułów dotykających finansów/podatków)
- [ ] Przejście przez erp-compliance (TaxLegalPBC)
- [ ] Brak implementacji prawa podatkowego poza TaxLegalPBC

### Jakość
- [ ] Przejście review przez erp-reviewer (zgodność z blueprintem >95%)
- [ ] Zero breaking changes bez ADR i wersji eventu

---

## 4. Zasady Zmian Kodu (Critical Rules)

1. **Never Break Existing Logic**  
   Nigdy nie usuwaj ani nie nadpisuj działającej logiki biznesowej, optymalizacji (useMemo, hooki, outbox relay, itp.) bez wyraźnego ADR i zgody erp-guardian.

2. **Prisma Rule**  
   Po każdej zmianie w `schema.prisma` **natychmiast** wykonaj:
   ```bash
   npx prisma db push
   npx prisma generate
   ```
   Przed napisaniem jakiegokolwiek kodu używającego nowych modeli.

3. **Maksymalnie 4–6 plików na iterację** (dla erp-coder)  
   Wyjątki tylko za zgodą erp-orchestrator.

4. **Event Versioning**  
   Każdy event ma wersję (`v1`, `v2`). Zmiana payloadu = nowa wersja + migracja.

5. **Commit Convention**  
   `ERP-###: [Module] Krótki opis zmiany (by {agent-role})`  
   Przykład: `ERP-042: PLM Add multi-level BOM with effectivity dates (by erp-coder)`

---

## 5. Struktura Pracy Agentów

### Hierarchia
- `erp-orchestrator` → planuje misje i zarządza kolejką
- `erp-guardian` → strażnik standardów i kontekstu
- `erp-domain-owner` → właściciel klastra domenowego (np. Manufacturing, Finance)
- `erp-architect` / `erp-coder` / `erp-reviewer` / `erp-tester` / `erp-compliance`

### Tryby Pracy
- **Focused Cluster Mode** (zalecany dla większości pracy)
- **Long-Running Autonomous Mission** (god-mode + szczegółowy Mission Brief)
- **Nuclear Parallel** (tylko dla całkowicie niezależnych modułów)

### Protokół Komunikacji
- Decyzje architektoniczne → `.agents/swarm/decisions/`
- Zamknięcia warstw → `.agents/orchestrator/CHECKPOINTS/WARSTWA*-CLOSURE.md` (jeden plik na warstwę)
- Plan misji i warstw → `docs/FEATURE-EXPANSION-ROADMAP.md` + `docs/PROJECT-STATE.md`
- Guardian może wstrzymać misję, jeśli wykryje naruszenie GOVERNANCE

---

## 6. Branching & Git Strategy

- `main` – chroniony, tylko po pełnym DoD + review
- `swarm/feature/ERP-###-nazwa` – gałęzie robocze agentów
- `swarm/hotfix/...` – pilne poprawki
- Po zakończeniu misji – squash + merge przez orchestratora lub człowieka

---

## 7. Najważniejsze Reguły dla Długotrwałej Pracy Autonomicznej

1. Zawsze zaczynaj od wczytania wymaganych plików kontekstowych.
2. Zapisuj checkpoint co 4–8 godzin lub po ukończeniu większego kawałka.
3. Jeśli trafisz na decyzję, która nie jest opisana w istniejących dokumentach – **zatrzymaj się** i utwórz ADR (lub zgłoś do orchestratora).
4. Po każdej większej zmianie uruchamiaj odpowiednie testy.
5. Szanuj istniejący kod i design systemu – rozbudowuj, nie niszcz.

---

## 8. Egzekucja

- `erp-guardian` ma prawo (i obowiązek) przerwać pracę dowolnego agenta, który narusza tę konstytucję.
- Zmiany w tym dokumencie wymagają ADR i zgody człowieka (lub orchestratora z wysokim poziomem uprawnień).

**To jest prawo projektu. Reszta to szczegóły implementacyjne.**

---

*Podpisano przez erp-orchestrator (Faza 0 – 2026-04)*
