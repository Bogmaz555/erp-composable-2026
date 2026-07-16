# PLM – Product Lifecycle Management (Blueprint)

**Kod:** `plm-service`  
**Właściciel:** Manufacturing Domain Owner  
**Status:** Draft (Faza 0)  
**Wersja:** 0.1

---

## 1. Business Purpose

PLM jest **sercem inżynierii** w firmie budującej maszyny i linie na zamówienie. Odpowiada za zarządzanie wiedzą techniczną o produkcie przez cały cykl życia – od pierwszej koncepcji, przez warianty ofertowe, wersje produkcyjne, aż po serwis i modyfikacje u klienta.

Bez solidnego PLM reszta systemu (PM, MES, Zakupy, Jakość) działa na ślepo.

---

## 2. Bounded Context Granice

### In Scope
- Item Master (części, podzespoły, maszyny)
- Engineering BOM (wielopoziomowy, z wariantami)
- Manufacturing BOM (pochodny od Engineering BOM)
- Engineering Change Orders (ECO) + proces zatwierdzania
- Wersjonowanie i efektivity (ważność od/do)
- Konfiguracja produktów (150% BOM / configurable BOM)
- Powiązanie z dokumentacją techniczną (CAD, schematy, instrukcje)

### Out of Scope (explicit)
- Zarządzanie projektami i zadaniami (to PM)
- Planowanie produkcji i harmonogramowanie (MES)
- Magazyn i ruchy materiałowe (Inventory)
- Kontrola jakości wykonania (Quality)

---

## 3. Główne Agregaty

- `Item` (z bogatymi atrybutami technicznymi)
- `EngineeringBOM` + `BOMComponent` (z pozycją, qty, alternates, effectivity)
- `EngineeringChangeOrder` (z impact analysis)
- `ProductConfiguration` / `Variant`

**Krytyczne Invarianty:**
- BOM nie może zawierać cykli
- Zmiana BOM wymaga ECO powyżej pewnego progu
- Każda wersja BOM ma jasną datę obowiązywania

---

## 4. Kluczowe Procesy

1. Tworzenie nowego Itemu / części
2. Budowa BOM inżynieryjnego (ręczna + import z CAD)
3. Konfiguracja oferty (CPQ → tymczasowy BOM ofertowy)
4. Przekazanie do produkcji (Engineering BOM → Manufacturing BOM + Routings)
5. Zmiana inżynieryjna (ECO) + propagacja wpływu

---

## 5. Eventy Emitowane (planowane)

- `plm.item.created.v1`
- `plm.bom.released.v1`
- `plm.eco.approved.v1`
- `plm.bom.changed.v1` (z impact summary)

---

## 6. Eventy Konsumowane

- `crm.opportunity.accepted.v1` → utworzenie struktur dla nowego projektu
- `pm.project.released.v1` → freeze wersji BOM dla produkcji

---

## 7. Szczególne Wymagania dla ETO / Produkcji Jednostkowej

- Pełna traceability "as-designed" → "as-built" → "as-maintained"
- Wsparcie dla bardzo dużych BOM-ów (nawet 2000-5000 pozycji na maszynę)
- Możliwość wielu aktywnych wersji tego samego produktu (różni klienci)
- Ścisła integracja z dokumentacją (rysunki, 3D, EPLAN, certyfikaty)

---

## 8. Aktualny Stan (Faza 0)

Obecny model w `plm-service` jest **niedostateczny**:
- `EngineeringBOM.components` jako JSON string (anty-pattern)
- Brak prawdziwej struktury wielopoziomowej
- Brak efektivity dates
- Brak wariantów i konfiguracji

**To jeden z najwyższych priorytetów Fazy 1.**

---

## 9. Powiązane Dokumenty

- `docs/MODULES/01-plm/DOMAIN-MODEL.md` (do stworzenia)
- `docs/MODULES/01-plm/INTEGRATION-MATRIX.md` (do stworzenia)
