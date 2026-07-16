# ERP Architecture Blueprint – Composable ERP 2026

## 1. Założenia Główne (Core Principles)
- **Architektura:** Composable ERP (Packaged Business Capabilities / Microservices). System składa się z w pełni niezależnych modułów biznesowych (Bounded Contexts), np. CRM, HR, Inventory, Manufacturing.
- **Podejście Architektoniczne:** Domain-Driven Design (DDD), Command Query Responsibility Segregation (CQRS) oraz Event Sourcing.
- **Wzorzec Danych (Strict):** Database-per-Service. Każdy mikroserwis posiada własną, odizolowaną bazę danych. Bezpośrednie łączenie się (JOIN) między bazami różnych modułów jest absolutnie zabronione.
- **Komunikacja Międzyserwisowa:** Asynchroniczna, Event-Driven. Moduły komunikują się wyłącznie poprzez emisję i nasłuchiwanie zdarzeń na szynie danych (Kafka / NATS). Transakcje rozproszone obsługiwane są przez wzorzec Saga (z mechanizmami kompensacji).

## 2. API Gateway i Frontend
- **API Gateway:** Pełni rolę jedynego punktu wejścia (Single Entry Point) dla aplikacji klienckich. Odpowiada za routing, autoryzację, rate limiting i agregację danych z wielu mikroserwisów przed wysłaniem ich do frontendu.
- **Frontend / Portal:** Next.js 15 (App Router), React 19, Tailwind CSS. Aplikacja SPA (Single Page Application) komunikująca się wyłącznie z API Gateway.

## 3. Stos Technologiczny Backend (Tech Stack)
- **Logika Domenowa:** NestJS 10+, TypeScript (Strict Mode).
- **Bazy Danych i Pamięć:** - Modele odczytu i CRUD (dla poszczególnych serwisów): PostgreSQL zarządzany przez Prisma ORM.
  - Event Store: PostgreSQL + TimescaleDB (lub dedykowany EventStoreDB).
  - Cache i Session: Redis.

## 4. Compliance i Integracje Prawne
- **TaxLegalPBC:** Polskie standardy księgowe i podatkowe (KSeF 2.0 FA(3), JPK_V7(3), Split Payment, e-paragony) są zhermetyzowane wyłącznie w module `TaxLegalPBC`. Żaden inny moduł nie może implementować prawa podatkowego.