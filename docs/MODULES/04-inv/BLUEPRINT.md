# INV – Inventory & Warehouse (Blueprint)

**Kod:** `inv-service`  
**Status:** Draft  
**Wersja:** 0.1

## Business Purpose

Pełna kontrola nad materiałami z naciskiem na **traceability** (LOT + Serial Number) — absolutnie kluczowe przy budowie maszyn i urządzeń na zamówienie.

## Aktualny Stan

Podstawowy model (Item + StockLevel). Brak LOT/SN, rezerwacji na projekt, zaawansowanego zarządzania lokalizacjami.

## Najwyższe Priorytety Rozwoju

- Pełna obsługa numerów partii i numerów seryjnych
- Genealogy (forward + backward traceability)
- Rezerwacje na projekt/zlecenie
- Zarządzanie lokalizacjami (bin, zone, warehouse)
- ABC analysis + cycle counting
- Integracja z MES (konsumpcja materiałów)

Ten moduł + PLM + MES razem tworzą kręgosłup traceability całego systemu.

**Faza 1 Status (SILENT-32):** Pełna obsługa rezerwacji, genealogy (via bomComponentId links), LOT/SN basics, i event-driven release/consumption z MES/PLM jest w dużej mierze zaimplementowana i przetestowana (patrz checkpointy i testy). Core ETO traceability substantially complete.
