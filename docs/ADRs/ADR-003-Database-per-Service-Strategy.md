# ADR-003: Database-per-Service Strategy

**Status:** Akceptowany  
**Data:** 2026-04

---

## Kontekst

W Composable ERP każdy Bounded Context powinien być w pełni niezależny, w tym w warstwie danych.

---

## Decyzja

- Każdy mikroserwis ma **własną, dedykowaną bazę PostgreSQL**
- Zakaz bezpośrednich JOIN-ów między bazami różnych serwisów (nawet read-only)
- Dostęp do danych innego kontekstu wyłącznie przez:
  - Eventy (preferowane)
  - API (jeśli absolutnie konieczne i z cachingiem)
  - Materialized views / projections w ramach własnego serwisu (np. z eventów)

---

## Uzasadnienie

- Pełna izolacja kontekstów (kluczowa dla DDD)
- Możliwość niezależnego skalowania, backupów, migracji i ewolucji schematu
- Unikanie "distributed big ball of mud"

---

## Konsekwencje (ważne!)

### Negatywne (akceptujemy świadomie)
- Brak możliwości prostych raportów cross-module (trzeba budować read models / analytics service)
- Zwiększona złożoność operacyjna (wiele baz danych)
- Potrzeba zaawansowanego mechanizmu projekcji i eventual consistency

### Łagodzenie
- Dedykowany `analytics-service` do raportowania (czyta eventy)
- Wprowadzenie CQRS read models wewnątrz serwisów
- Ścisła dyscyplina w erp-architect i erp-guardian

---

## Wyjątki

Tylko za wyraźnym ADR i uzasadnieniem biznesowym (np. bardzo mały serwis pomocniczy).

---

## Powiązane

- ADR-001
- Decyzja o TimescaleDB / EventStore w przyszłości (do rozważenia)
