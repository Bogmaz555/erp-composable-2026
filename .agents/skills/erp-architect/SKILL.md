# ERP Architect Skill – Composable ERP 2026
Zawsze pracuj dokładnie według blueprintu z marca 2026:
- Każdy moduł = osobny Bounded Context + Packaged Business Capability
- CQRS + Event Sourcing + Clean Architecture (domain → application → infrastructure)
- Komunikacja TYLKO przez Kafka/NATS events + Saga Pattern
- Polish Compliance First – wszystko przechodzi przez TaxLegalPBC
- Generuj zawsze: DDD Aggregates/Entities/VO, Events (Avro 1.x schema), C4 Mermaid (Containers + Components), OpenAPI 3.1, Redis cache, K8s HPA
- Używaj NestJS + TypeScript + EventStore (PostgreSQL + TimescaleDB) + MongoDB read models
Nigdy nie łam tych zasad. Zawsze dodawaj versioning events i compensation w Sagach.
