# Security & Zero Trust Roadmap

**Wersja:** 1.0  
**Data:** 2026-04 (Faza 0 – MISSION-004)  
**Status:** Plan gotowy

---

## Aktualny Stan

**Krytyczna luka:** System nie ma żadnej warstwy uwierzytelniania i autoryzacji. Każdy endpoint jest publiczny. To jest największe pojedyncze ryzyko produkcyjne całego projektu.

---

## Docelowa Architektura (Zero Trust)

- **Identity Provider:** Keycloak (zalecane) lub Auth0
- **Token:** JWT (z claims: userId, roles, permissions, tenantId)
- **Gateway jako Edge Auth:** Tylko Gateway waliduje tokeny. Serwisy wewnętrzne ufają nagłówkom od Gateway (lub używają mTLS + service accounts).
- **RBAC + ABAC:** Role + attribute-based permissions (np. dostęp do konkretnego projektu, klienta, maszyny).
- **mTLS między serwisami** (docelowo)
- **Audit Log** wszystkich akcji (szczególnie zmian w projektach, BOM, fakturach)

---

## Plan Wdrożenia (Faza 1)

### Etap 1 – Podstawy (3-5 tygodni)

1. Wybór i postawienie Keycloak (lub Auth0) + realm dla ERP
2. Zdefiniowanie podstawowych ról (Admin, Sales, Engineer, Production Manager, Accountant, Service, Viewer)
3. Wdrożenie walidacji JWT wyłącznie w API Gateway
4. Propagacja podstawowych claims do downstream services (x-user-id, x-roles, x-tenant-id)
5. Prosty RBAC w gateway (np. endpointy tylko dla określonych ról)

### Etap 2 – Rozszerzenie (równolegle z rozwojem domeny)

- Dodawanie permissions na poziomie zasobów (np. "może edytować tylko projekty, do których ma dostęp")
- Wprowadzenie service-to-service auth (mTLS lub JWT service accounts)
- Audit logging (centralny serwis lub baza append-only)
- Ochrona wrażliwych operacji (ECO approval, release projektu, wystawianie faktur)

### Etap 3 – Zaawansowane (Faza 2+)

- Fine-grained ABAC
- Dynamiczne polityki (np. przez OPA)
- Secrets management (Vault lub Kubernetes secrets)
- Regularne pentesty + SAST/DAST w pipeline

---

## Najważniejsze Rekomendacje

- **Nie zaczynaj implementacji domeny bez Auth** — nawet wewnętrzny pilot będzie niebezpieczny.
- Zaczynaj od Gateway jako jedynego punktu wejścia.
- Używaj istniejącego mechanizmu `x-tenant-id` i rozszerzaj go o user context.
- Zintegruj Auth z frontendem (NextAuth lub custom) już na etapie pierwszych ekranów wymagających logowania.

---

## Własność

- erp-guardian + erp-architect odpowiadają za jakość tego obszaru.
- Wdrożenie powinno być jedną z pierwszych większych misji technicznych Fazy 1.

**Brak bezpieczeństwa = projekt nie nadaje się do żadnego realnego użycia poza czystym demo.**
