# ADR-001: Composable Microservices Architecture (DDD + CQRS + Event-Driven)

**Status:** Akceptowany  
**Data:** 2026-04  
**Decydenci:** erp-orchestrator (na podstawie pierwotnej wizji projektu)

---

## Kontekst

Projekt ma być długoterminowym, skalowalnym systemem ERP klasy enterprise dla produkcji jednostkowej (ETO) maszyn i linii. Wymaga wysokiej elastyczności, niezależnego developmentu poszczególnych obszarów biznesowych oraz możliwości skalowania wybranych części systemu niezależnie.

---

## Decyzja

Przyjmujemy **Composable ERP** oparty na:

- **Bounded Contexts** jako niezależne mikroserwisy (PBC – Packaged Business Capabilities)
- **Domain-Driven Design** (agregaty, konteksty, ubiquitous language)
- **CQRS** (Command Query Responsibility Segregation) z NestJS `@nestjs/cqrs`
- **Event-Driven Architecture** z NATS JetStream + Outbox Pattern
- **Database-per-Service** (każdy serwis ma własną bazę PostgreSQL)

---

## Uzasadnienie

- Umożliwia równoległy rozwój wielu zespołów/agentów bez wzajemnego blokowania
- Dobrze wspiera ewolucyjną architekturę (łatwo dodawać/usługi nowe moduły)
- Naturalne dopasowanie do rzeczywistości produkcyjnej ETO (różne obszary mają różną dynamikę zmian)
- Wysoka skalowalność wybranych części (np. MES pod obciążeniem produkcyjnym)
- Łatwiejsze testowanie kontraktowe i izolacja awarii

---

## Konsekwencje

### Pozytywne
- Wysoka niezależność modułów
- Możliwość stosowania różnych wzorców wewnątrz modułów
- Dobrze wspiera AI-assisted development (ograniczone zakresy)

### Negatywne / Ryzyka
- Znacznie wyższa złożoność operacyjna (monitoring, debugging, deployment)
- Konieczność zarządzania distributed transactions (Saga + compensation)
- Ryzyko "distributed monolith" przy słabych kontraktach
- Wysokie wymagania wobec jakości eventów i versioning

### Łagodzenie Ryzyk
- Obowiązkowy centralny Event Registry (`docs/EVENTS/`)
- Ścisłe Definition of Done wymagające contract tests
- erp-guardian pilnujący jakości integracji
- Wprowadzenie Saga Orchestratora (Temporal lub własny) od Fazy 1

---

## Alternatywy Rozważane

- **Modularny Monolit** – odrzucony ze względu na długoterminową skalowalność i niezależność rozwoju
- **Klasyczny SOA z ESB** – odrzucony (przestarzałe)
- **Serverless Functions** – odrzucone dla core ERP

---

## Powiązane

- ADR-002 (Event Communication)
- ADR-003 (Database-per-Service)
- GOVERNANCE.md → sekcja Definition of Done
