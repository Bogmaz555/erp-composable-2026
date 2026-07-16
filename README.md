# MAX SPEED ERP 2026 🦅🚀

**MAX SPEED ERP** to zaawansowany, kompozytowy system ERP (Enterprise Resource Planning) nowej generacji, zaprojektowany pod kątem autonomicznej produkcji ETO (Engineering-To-Order) oraz ciągłej analityki. Zbudowany z myślą o Przemyśle 4.0, charakteryzuje się rozproszoną architekturą sterowaną zdarzeniami (Event-Driven Architecture) i brutalnie szczerym podejściem do zarządzania czasem (Łańcuch Krytyczny CCPM).

## Architektura Systemu 🏗️

Projekt zrealizowany w formie monorepo (pnpm workspaces) integrujący 12 autorskich mikroserwisów.
Główne filary technologiczne:
* **Backend:** [NestJS](https://nestjs.com/) w rygorystycznym trybie CQRS
* **Frontend:** [Next.js](https://nextjs.org/) (React)
* **Szyna Danych:** [NATS JetStream](https://nats.io/)
* **Bazy Danych:** PostgreSQL (osobne schematy na każdy mikroserwis via Prisma) + Dostęp mTLS + HashiCorp Vault dla bezpieczeństwa sekretów.
* **Wzorzec Outbox:** Asynchroniczny i pancerny mechanizm dostarczania zdarzeń pomiędzy bazą danych a brokerem komunikatów.
* **Autoryzacja:** Keycloak

## Kluczowe Moduły (Kombinaty Operacyjne) ⚙️

- **PM Service:** Zarządzanie projektami ETO z wykorzystaniem metodyki Łańcucha Krytycznego (CCPM) i inteligentnej wyceny kosztów (Universal Journal).
- **MES Service:** Realizacja produkcji na hali zrobotyzowanej, moduły ANDON i pauzy kosztowe zależne od incydentów.
- **Quality Service (QMS):** Wystawianie Cyfrowych Paszportów Maszyn z audytami zgodności (COMPLIANT) niezbędnych pod wdrożenie u klientów.
- **API Gateway:** Centralny węzeł przepustowy na architekturze TLS/mTLS, zabezpieczający cały ruch.
- **DMS, EAM, CRM, Proc, Inv:** Skalowalne serwisy wspomagające pełny obieg od zakupów po logistykę i sprzedaż B2B.

## Konfiguracja i Uruchomienie 🔌

System oferuje skrypt automatycznego startu, który samodzielnie wstaje i rekonfiguruje się w zależności od zasobów środowiska.

```bash
# Instalacja zależności
pnpm install

# Inteligentny start całej platformy (API, NATS, Frontend, Bazy)
./scripts/boot-all-smart.sh
```

Aplikacja kliencka (Frontend) dostępna jest domyślnie na porcie: `http://localhost:3003`

## Twierdza Bezpieczeństwa (Security & SecOps) 🛡️
Projekt zbudowany z wbudowanym **Tenant Hardeningiem**, pełną retencją baz danych i odpornością na chaos w sieci (Chaos Injection Tested). W pełni przygotowany pod rygorystyczne normy wdrożeniowe ISO i audyty w środowiskach kubernetesowych.
