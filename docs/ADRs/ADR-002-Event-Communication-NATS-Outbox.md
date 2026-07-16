# ADR-002: Event Communication – NATS JetStream + Outbox Pattern

**Status:** Akceptowany  
**Data:** 2026-04

---

## Kontekst

W architekturze mikroserwisowej potrzebujemy niezawodnej, asynchronicznej komunikacji między Bounded Contexts bez tworzenia distributed monolithu.

---

## Decyzja

- **Broker:** NATS JetStream (zamiast Kafka)
- **Pattern:** Outbox + Polling Relay (w każdym serwisie emitującym eventy)
- **Tracing:** OpenTelemetry propagation przez NATS headers
- **Gwarancja dostarczenia:** At-least-once (z deduplikacją po stronie konsumenta gdzie krytyczne)

---

## Uzasadnienie

- NATS jest lżejszy, szybszy i prostszy w obsłudze niż Kafka (mniejsze koszty operacyjne dla średniej firmy)
- JetStream daje trwałość wiadomości i replay
- Outbox Pattern rozwiązuje problem "dual write" (atomowość zapisu do bazy + publikacji eventu)
- OpenTelemetry propagation jest już częściowo zaimplementowana (CRM)

---

## Konsekwencje

### Wymagania
- Każdy serwis emitujący eventy **musi** mieć tabelę `OutboxEvent` + `OutboxRelayService`
- Relay musi działać niezawodnie (retry, dead letter)
- Wersjonowanie eventów obowiązkowe

### Ograniczenia
- Eventual consistency jest akceptowana (trzeba projektować UI i procesy pod to)
- Potrzeba dobrego monitoringu kolejek i opóźnionych eventów

---

## Powiązane

- ADR-001
- `docs/STANDARDS/event-versioning.md` (do stworzenia)
- Przykłady implementacji: `crm-service/outbox-relay.service.ts`
