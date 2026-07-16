# API Gateway Stabilization Plan

**Wersja:** 1.0  
**Data:** 2026-04 (Faza 0 – MISSION-004)  
**Status:** Plan gotowy do realizacji w Fazie 1

---

## 1. Aktualny Stan (Diagnoza)

Obecny API Gateway (`apps/api-gateway`) jest hybrydą dwóch różnych mechanizmów proxy:

1. **fastify-http-proxy** (używany dla: CRM, PM, INV, PROC, Analytics)
2. **Custom fetch-based proxy controllers** (MesController, PlmController, FinController, EamController, QualityController itp.)

### Główne Problemy

- **Niespójność implementacji** — trudna konserwacja i debugowanie
- **Brak ujednoliconego error handlingu / circuit breaker / retry**
- **Słaba agregacja danych** (gateway prawie nie robi kompozycji)
- **Tenant propagation** jest zaimplementowana, ale krucha
- **Brak centralnego miejsca na cross-cutting concerns** (auth, rate limiting, logging, tracing)
- **Trudności z testowaniem** i symulacją awarii serwisów
- Porty serwisów są hardkodowane w wielu miejscach

**Ryzyko:** Wysokie. Przy większej liczbie modułów i ruchu produkcyjnym gateway stanie się bottleneckem i źródłem niestabilności.

---

## 2. Docelowa Wizja Gateway (Faza 1+)

Gateway powinien ewoluować w kierunku **API Composition Layer + Edge** z następującymi cechami:

- Jeden spójny mechanizm routingu i proxy (zalecane: `@nestjs/microservices` + HTTP proxy lub dedykowany Fastify plugin)
- Centralne miejsce na:
  - Authentication & Authorization (JWT validation + RBAC/ABAC)
  - Rate limiting
  - Request aggregation / BFF patterns (dla złożonych ekranów)
  - Circuit breaker + retry + timeout
  - Distributed tracing (już częściowo jest)
- Dobrze zdefiniowane kontrakty z każdym Bounded Context (OpenAPI lub AsyncAPI dla eventów)
- Możliwość łatwego dodawania nowych serwisów bez zmian w kodzie gateway

---

## 3. Plan Realizacji (Krok po Kroku)

### Faza 1.1 – Szybka Stabilizacja (2-3 tygodnie)

1. **Wybór jednego mechanizmu proxy**
   - Rekomendacja: Zunifikować na custom NestJS/Fastify proxy controllers (łatwiejsze do rozszerzania o auth, tracing, agregację).
   - Albo przejść w pełni na `@fastify/http-proxy` + pluginy.

2. **Ujednolicenie wszystkich tras**
   - Przenieść wszystkie custom proxy (mes, plm, quality, eam, fin) na ten sam mechanizm co CRM/PM.
   - Usunąć duplikację kodu.

3. **Wzmocnienie resilience**
   - Dodać timeouty per serwis
   - Dodać podstawowy circuit breaker (np. opossum lub własny)
   - Lepsze error mapping (502/503/504 z sensownymi komunikatami)

4. **Poprawa tenant handling**
   - Upewnić się, że `x-tenant-id` jest zawsze przekazywany konsekwentnie.

### Faza 1.2 – Wprowadzenie Auth (równolegle lub zaraz po 1.1)

- Gateway staje się **jedynym miejscem**, gdzie walidowany jest JWT.
- Wprowadzenie Keycloak lub Auth0 (lub własny lightweight jeśli na początek).
- Propagacja claims (userId, roles, tenant) do downstream services (najlepiej jako signed headers lub JWT forwarding).

### Faza 1.3 – Agregacja i BFF (później w Fazie 1)

- Zaczynać dodawać proste endpointy agregujące dane z kilku serwisów (np. "Project Dashboard" data).
- Unikać nadmiernej agregacji na początku.

### Faza 1.4 – Zaawansowane (Faza 2+)

- Service discovery (jeśli przejdziemy na Kubernetes)
- Centralny rate limiting + quota per tenant
- Caching warstwy (Redis) dla często odpytywanych, rzadko zmieniających się danych
- GraphQL BFF (opcjonalnie, jeśli frontend bardzo tego potrzebuje)

---

## 4. Rekomendowana Kolejność Prac

1. Analiza i decyzja o ujednoliconym mechanizmie proxy (1-2 dni)
2. Refaktoryzacja wszystkich proxy do jednego stylu (1-2 tygodnie)
3. Dodanie resilience (timeouts, circuit breaker) (1 tydzień)
4. Wprowadzenie Auth w Gateway (największy wysiłek, 3-5 tygodni)
5. Stopniowe dodawanie agregacji tam, gdzie najbardziej boli frontend

---

## 5. Ryzyka i Założenia

- Zmiana gatewaya będzie miała wpływ na wszystkie frontendowe wywołania — trzeba to robić ostrożnie z dobrą strategią rollout.
- Auth wprowadzamy **najpierw w Gateway**, potem stopniowo w serwisach (zero-trust).
- Nie próbujemy robić wszystkiego naraz — stabilizacja przed dużymi zmianami domenowymi.

---

## 6. Własność i Odpowiedzialność

- **Właściciel techniczny:** erp-architect + jeden dedykowany agent/coder na gateway
- **Review:** erp-guardian (szczególnie pod kątem bezpieczeństwa i spójności)

---

**Ten plan powinien być podstawą pierwszej większej misji technicznej w Fazie 1.**
