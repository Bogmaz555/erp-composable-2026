# MES – Manufacturing Execution System (Blueprint)

**Kod:** `mes-service`  
**Właściciel:** Manufacturing Domain Owner  
**Status:** Draft (Faza 0)  
**Wersja:** 0.1

---

## 1. Business Purpose

MES jest odpowiedzialny za **rzeczywistą realizację produkcji** na hali. W firmie ETO budującej maszyny i linie to jeden z najważniejszych modułów — odpowiada za to, co naprawdę zostało zrobione, z czego, przez kogo i z jaką jakością.

---

## 2. Granice Kontekstu

### In
- Work Orders i operacje
- Routings / procesy technologiczne
- Rejestracja produkcji (ilość dobra, braki, czas)
- Zużycie materiałów na zlecenie (backflush lub ręczne)
- As-built genealogy
- Integracja z maszynami / IoT (w przyszłości)

### Out
- Planowanie (MRP/APS) – to osobny obszar lub PM + analytics
- Definicja BOM i Item Master – PLM
- Magazyn (ruchy, lokalizacje) – Inventory

---

## 3. Główne Agregaty (planowane)

- `WorkOrder`
- `Operation` / `RoutingStep`
- `ProductionRecord`
- `MaterialConsumption`
- `LaborEntry`

---

## 4. Krytyczne Procesy ETO

- Generowanie Work Orders z BOM + Routing
- Rejestracja postępu produkcji (szczególnie ważne przy budowie dużych maszyn)
- Traceability "as-built" (jeden z najtrudniejszych i najważniejszych wymagań)
- Integracja z jakością (bramy jakości na operacjach)

---

## 5. Aktualny Stan (Faza 0)

Obecny model jest **bardzo podstawowy** (tylko WorkOrder ze statusem). Brak routingu, operacji, zużycia materiałów, traceability.

**To jeden z największych obszarów do rozbudowy w Fazie 1.**

---

## 6. Kluczowe Integracje

- PLM → MES (BOM + Routing)
- PM → MES (harmonogram)
- INV → MES (materiały)
- Quality → MES (kontrola na bramach)
- Finance → MES (koszty rzeczywiste robocizny i materiałów)
