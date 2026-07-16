# PM – Project Management (Blueprint)

**Kod:** `pm-service`  
**Status:** Draft (Faza 0)  
**Wersja:** 0.2

---

## Business Purpose

Zarządzanie projektami ETO — od oferty do uruchomienia u klienta. Szczególnie ważne jest wsparcie dla **Critical Chain Project Management (CCPM)**, zarządzanie buforami, WBS wielopoziomowy i ścisłe powiązanie z inżynierią (PLM) oraz produkcją (MES).

---

## Aktualny Stan

Jedna z najmocniejszych części obecnego systemu:
- Project + WBS hierarchy
- CCPM fields (feverZone, buffers, totalChainDays)
- Integracja z CRM (create project from opportunity)

## Największe Luki do Zaadresowania w Fazie 1

- Pełne zależności między zadaniami (finish-to-start, lags)
- Resource leveling (ludzie + maszyny + kompetencje)
- Automatyczne generowanie WBS z BOM (PLM)
- Earned Value Management
- Ryzyka i change management na poziomie projektu
- Integracja z MES (postęp rzeczywisty vs plan)

---

## Kluczowe Eventy

- `pm.project.released.v1` (najważniejszy)
- `pm.material.requested.v1`
