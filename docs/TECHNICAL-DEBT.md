# ERP 2026 – Rejestr Długu Technicznego (Faza 0 – Wersja Finalna)

**Cel:** Priorytetyzowany backlog do realizacji w Fazie 1+.  
**Ostatnia aktualizacja:** 2026-04 (MISSION-004)

---

## Priorytet 1 – Critical (Zrób na samym początku Fazy 1)

| ID | Problem | Wpływ | Wysiłek | Sugerowana Kolejność | Notatki |
|----|---------|-------|---------|----------------------|---------|
| TD-001 | Brak jakiejkolwiek autoryzacji / Auth | Krytyczny (nie nadaje się do użytku) | Wysoki | — | 🟡 W37: platform/auth/readiness, RBAC 7 ról |
| TD-002 | Niespójny mechanizm proxy w API Gateway | Wysoki (niestabilność, trudna rozbudowa) | Średni | — | 🟡 W42: `GET /platform/gateway/readiness`, proxy probes (FA/PM/INV/HR), smoke + contract |
| TD-003 | Brak realnej Saga Orchestracji dla długich procesów | Bardzo wysoki przy integracjach ETO | Wysoki | 3 | 🟡 W29: readiness API (orchestrator + temporal + workflow), yellow-minimum |
| TD-004 | Płytkie modele domenowe w kluczowych modułach (PLM, MES, INV, Finance) | Bardzo wysoki (rdzeń wartości systemu) | Bardzo wysoki | 4 | To jest głównie praca domenowa, nie "dług" |

---

## Priorytet 2 – High (Zrób wcześnie w Fazie 1)

| ID | Problem | Wpływ | Wysiłek | Kolejność | Notatki |
|----|---------|-------|---------|-----------|---------|
| TD-005 | Brak wersjonowania eventów w kodzie | Wysoki | Średni | Po TD-002 | Używać Event Registry jako źródła prawdy |
| TD-006 | Mnóstwo `fix-*.js` na root + chaotyczny monorepo | Średni-wysoki (utrudnia pracę) | Niski | — | ✅ Usunięte 2026-06-06 (`scripts/repo-cleanup.sh`) |
| TD-007 | Niespójne Prisma client outputs i generowanie | Wysoki | Średni | Wczesna Faza 1 | Standaryzacja ścieżek i nazw |
| TD-008 | Brak centralnego mechanizmu retry / circuit breaker | Średni | Średni | — | 🟡 W28+W34: outbox DLQ + observability readiness |
| TD-009 | Słaba observability (tracing tylko częściowy) | Średni | Średni | — | 🟡 W26+W34: Jaeger + otel/status + readiness API |

---

## Priorytet 3 – Medium (Można robić równolegle z rozwojem domeny)

| ID | Problem | Wpływ | Wysiłek | Notatki |
|----|---------|-------|---------|---------|
| TD-010 | Różne wersje NestJS w overrides | Ryzyko | Niski | 🟡 W32: pnpm overrides 11.1.19 + audit API |
| TD-011 | Brak standaryzowanego `pnpm run boot:all` / docker dev experience | Uciążliwy | Średni | 🟡 W44: ensure-core-stack.sh, stack/readiness, regression 59/59 |
| F2-TAX | TaxLegal KSeF/JPK produkcyjny | Średni | Po Faza 2 | 🟡 W45: `/platform/tax/readiness`, KSeF sandbox env-gated |
| TD-012 | Brak pełnego testowania kontraktowego (Pact) | Średni | Średni-wysoki | 🟡 W48: Event Registry readiness API; Pact broker odłożony |
| TD-013 | Brak centralnego Audit Log | 🟡 W36 — structured fields + readiness API |

---

## Priorytet 4 – Low / Nice to Have

- Lepsze tooling wokół seedów i migracji
- Ujednolicenie tsconfigów i build pipeline
- Więcej metryk biznesowych w analytics-service

---

## Uwagi Ogólne

- Pozycje TD-001 i TD-002 są **blokujące** dla jakiegokolwiek poważniejszego użycia systemu.
- Prace domenowe (PLM, MES, Finance deep models) są **nie długiem**, tylko zaplanowanym zakresem Fazy 1.
- Przy każdej większej misji w Fazie 1 — aktualizować ten rejestr (usuwać zamknięte, dodawać nowe).

**Właściciel:** erp-orchestrator + erp-guardian

**Faza 1 Autonomous Progress (TD-001 - Auth):**
- Real JWT guards + req.user usage in PLM, MES, PM, INV HTTP controllers (critical ETO ops protected).
- Consistent x-user-id / x-roles extraction + audit logging now live in NATS listeners for plm.bom.released.v2, mes.production.recorded.v1, inventory.reservation.released.v1 (INV + MES + Finance WIP).
- Basic RBAC examples (@Roles + RolesGuard or inline) on BOM release and production start/finish.
- ETO traceability spine (bomComponentId flows) is now identity-aware end-to-end.
- Status: TD-001 significantly advanced in Manufacturing Core cluster.
- **SILENT-60:** Keycloak 24 w docker-compose (realm `erp`), `USE_KEYCLOAK_JWKS=true` w gateway, demo user `demo.engineer`.
- Remaining: end-to-end JWT smoke, broader RBAC matrix, mTLS later.

| Problem | Wpływ | Priorytet | Wysiłek |
|--------|-------|---------|---------|
| **Brak jakiejkolwiek autoryzacji** (największe ryzyko produkcyjne) | Krytyczny | Critical | Wysoki |
| Brak mTLS / zabezpieczeń między serwisami | Wysoki | High | Wysoki |
| Słaba observability (tylko częściowy tracing) | Średni | Medium | Średni |
| Brak centralnego audytu | Wysoki (compliance) | High | Średni |

---

## Kategoria 4: Modele Domenowe (najwięcej pracy w Fazie 1)

- PLM: components jako JSON string (bardzo zły)
- MES: praktycznie brak routingu i operacji
- Inventory: brak LOT/SN + genealogy
- Finance: prawie zerowy project accounting → **Significant progress (SILENT-51/54)**: Real ProjectCost (MATERIAL) + WipAccount (wipBalance + materialReserved) now created/updated on inventory.reservation.released.v1 events from the ETO spine.
- TaxLegal: prawie pusty

**Uwaga:** Te problemy są **oczekiwane** w Fazie 0. Nie są długiem — są po prostu zakresem do zaimplementowania.

---

## Rekomendacja dla MISSION-004

W MISSION-004 skupić się przede wszystkim na:
1. Gateway stabilization + ujednolicenie proxy
2. Plan czyszczenia fix-*.js i Prisma clients
3. Dokumentacja + backlog na wdrożenie Auth (Keycloak/Auth0)
4. Propozycja prostego mechanizmu Saga (nawet lekkiego na początek)

Ten dokument powinien być aktualizowany przez erp-orchestrator i erp-guardian.
