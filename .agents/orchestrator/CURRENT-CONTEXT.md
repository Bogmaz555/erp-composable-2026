# ERP 2026 – CURRENT CONTEXT (Żywy Obraz Projektu)

**Ostatnia aktualizacja:** 2026-04 (Start Fazy 1 – Manufacturing Core)  
**Wersja kontekstu:** 1.0 (Faza 0 closed 100%)

---

## 1. Ogólny Stan Projektu (Start Fazy 1)

- **Faza 0:** Zakończona w 100% (pełny governance, Event Registry, blueprinty, plany na Gateway/Auth/Debt).
- **Architektura docelowa:** W pełni poprawna i akceptowana (Composable ERP, DDD, CQRS, NATS + Outbox, DB-per-Service)
- **Poziom realizacji:** Zaawansowany POC / mocny demo sprzedażowy
- **Najmocniejsze obszary:**
  - CRM + CPQ (konfigurator ofert z milestone'ami płatności FAT/SAT, powiązanie z projektami)
  - PM z elementami CCPM (fever zones, bufory)
  - Podstawowy szkielet CQRS + NATS w kilku serwisach
  - Nowoczesny frontend (glassmorphism, TanStack Query)
- **Główne wyzwanie Fazy 1:**
  - Przejście z płytkich modeli na **głębokie domenowe** dla ETO (szczególnie PLM BOM, MES traceability, Inventory genealogy).
  - Budowa end-to-end traceability dla budowy maszyn.
- **Największe ryzyka techniczne (z TD rejestru):**
  - TD-001: Brak Auth (Critical)
  - TD-002: Niespójny API Gateway (Critical)
  - Słabe modele domenowe w Manufacturing Core

**Zasada Fazy 1:** Zaczynamy od głębokich modeli danych + eventów w klastrze Manufacturing, równolegle przygotowujemy Auth (zaczynając od Gateway).

**Latest Autonomous (SILENT-59 + PAUSE):** 
- Zakończono podstawowe realne rozliczanie projektów ETO (ProjectCost + WipAccount na spine).
- Wzmocniono testy (w tym contract-like).
- Poprawiono dokumentację w gatewayu.
- **Stan pracy zapisany** w `.agents/orchestrator/CHECKPOINTS/FAZA1-AUTONOMOUS-PAUSE-STATE.md` na wyraźne żądanie użytkownika.
- Progress wg Closure Checklist: ~77-84%.
Praca gotowa do bezpiecznego wznowienia w dowolnym momencie. Wszystkie kluczowe artefakty governance są aktualne.

---

## 2. Kluczowe Ryzyka (Faza 0 musi je adresować)

1. **Utrata kontekstu** przy długiej pracy autonomicznej
2. **Fragmentacja kontraktów** między modułami (brak centralnego Event Registry)
3. **Niespójność techniczna** (gateway, monorepo, Prisma)
4. **Brak DoD** → poprzednie swarmy raportowały "gotowe", gdy było tylko 15-20% funkcjonalności
5. **Zero auth** → niemożliwe do użycia nawet wewnętrznie

---

## 3. Co Jest "Frozen" / Chronione (nie ruszamy bez ADR)

- Istniejący design UI (glassmorphism + istniejące hooki i memoizacja)
- Struktura CQRS w serwisach, które już ją mają (CRM, PM, MES)
- Outbox Relay w CRM
- CCPM fields w PM
- CPQ Configurator i jego logika biznesowa

---

## 4. Najważniejsze Decyzje z Przeszłości (do przepisania jako ADR w Faza 0)

- Użycie NATS + Outbox zamiast czystego event store
- Database-per-Service (nawet kosztem złożoności)
- TaxLegalPBC jako jedyny moduł dotykający prawa podatkowego
- Next.js 15 + App Router + shadcn-like + Tailwind glassmorphism
- Agresywny swarm równoległy jako metoda rozwoju

---

## 5. Stan Agentów i Procesu (Faza 0)

- Istniejące skille: erp-architect, erp-coder, erp-reviewer, erp-tester, erp-compliance, god-mode, swarm-max-speed
- Problem poprzednich swarmów: zbyt agresywny parallel bez wystarczającej kontroli jakości i kontekstu
- Nowa struktura (Faza 0): Wprowadzamy erp-orchestrator + erp-guardian + hierarchię + misje

---

## 6. Co Robimy w Faza 0 (priorytet)

1. Utworzenie pełnego systemu governance (GOVERNANCE.md + ADRy + szablony)
2. Wzmocnienie skilli agentów o Context Injection + DoD
3. Stworzenie Event Registry i pierwszych Module Blueprints
4. Stabilizacja API Gateway (najbolesniejszy punkt techniczny)
5. Czyszczenie najgorszego długu monorepo
6. Przygotowanie pierwszej dużej misji klastra Manufacturing

---

## 7. Otwarty Status

- **TaxLegalPBC** – najwyższy priorytet compliance (musi ruszyć równolegle z Fazą 1)
- **Bezpieczeństwo** – planujemy wprowadzić Keycloak/Auth0 w Fazie 1
- **Testy** – obecnie fikcyjne w większości miejsc

---

**Ten plik jest aktualizowany przez erp-orchestrator po każdej większej fazie lub misji.**

**Każdy agent rozpoczynający pracę ma OBOWIĄZEK przeczytać ten plik jako jeden z pierwszych.**
