# Faza 1 – Manufacturing Core Plan

**Cel:** Zbudować solidny rdzeń dla produkcji jednostkowej maszyn – głęboki PLM, zaawansowany PM, MES z traceability i Inventory z pełną genealogią.

**Czas:** 8-12 tygodni (zależnie od intensywności)

**Główny Klaster:** PLM + PM + MES + INV

---

## 1. Cele Biznesowe Fazy 1

- Możliwość pełnego zamodelowania skomplikowanej maszyny (wielopoziomowy BOM z wariantami, efektivity, zmianami inżynieryjnymi).
- Pełna traceability: od oferty → BOM → projekt → rezerwacje materiałów → produkcja (as-built) → FAT/SAT.
- Zaawansowane zarządzanie projektami ETO z integracją do inżynierii i produkcji.
- Podstawy do MRP i planowania (fundament pod Fazę 2).

---

## 2. Struktura Misji (Proposed)

**Faza1-M01: Deep PLM Foundation** (najwyższy priorytet)
- Item Master z bogatymi atrybutami
- Prawdziwy multi-level BOM (BOMVersion, BOMComponent z effectivity, alternates)
- Engineering Change Order z impact analysis
- Podstawowe wersjonowanie i release

**Faza1-M02: PM Advanced + PLM Integration**
- Rozbudowa WBS o zależności, zasoby, baseline
- Automatyczne generowanie zadań z BOM
- Resource leveling (podstawowe)
- Event-driven integration z PLM (BOM release → projekt)

**Faza1-M03: MES Core + As-Built**
- Routing / Operations / Work Centers
- Rejestracja produkcji (good/scrap, labor, material consumption)
- As-built record powiązany z BOM i partiami
- Bramy jakości

**Faza1-M04: Inventory Full Traceability**
- LOT + Serial Number full support
- Rezerwacje na projekt/zlecenie
- Genealogy (forward/backward)
- Warehouse + Bin management (podstawy)

**Faza1-M05: Core Integration Sagas**
- Kluczowe przepływy: Opportunity Accepted → Project + BOM structures
- BOM Release → Material Reservations + Work Orders
- Production Completion → Inventory consumption + As-Built update + Finance events

**Równolegle:**
- TaxLegalPBC (KSeF) – mały dedykowany tor
- Podstawy Auth (zaczynając od Gateway)

---

## 3. Zasady Pracy w Fazie 1

- Zawsze zaczynaj od przeczytania: GOVERNANCE.md + Blueprint modułu + Event Registry + CURRENT-CONTEXT
- Po każdej zmianie schema.prisma → natychmiast `prisma db push` + `prisma generate`
- Aktualizuj dokumentację (Blueprint + Eventy) przy każdej większej zmianie domenowej
- Używaj CQRS + Outbox dla wszystkich zmian stanu
- Pilnuj granic kontekstów (PLM nie robi planowania, MES nie zarządza BOM)
- erp-domain-owner (Manufacturing) + erp-guardian mają veto na jakość

---

## 4. Ryzyka i Łagodzenie

- Największe ryzyko: próba zrobienia wszystkiego naraz → rozwiązujemy przez sekwencyjne misje + focused cluster.
- Auth opóźniony → robimy minimalny Auth równolegle od początku (TD-001).
- Gateway kruchy → stosujemy plan z GATEWAY-STABILIZATION-PLAN.md stopniowo.

---

**Ten dokument jest żywy i będzie aktualizowany przez erp-orchestrator podczas Fazy 1.**

**Status Update (SILENT-31):** 
Core Manufacturing ETO traceability (BOM v2 with bomComponentId → full production/consumption/as-built + reservation events) is substantially complete and tested. 
Gateway has functional JWT/Keycloak foundation (TD-001 advanced). 
See `docs/FAZA1-MANUFACTURING-CLOSURE.md` and `docs/FEATURE-EXPANSION-ROADMAP.md` for current status.
