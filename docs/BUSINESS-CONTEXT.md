# ERP 2026 – Żywy Kontekst Biznesowy (Business Context)

**Wersja:** 0.8 (Faza 0)  
**Ostatnia aktualizacja:** 2026-04

---

## 1. Profil Firmy i Model Produkcji

**Typ produkcji:** Dyskretna, jednostkowa / Engineer-to-Order (ETO)  
**Główne produkty:**
- Maszyny i urządzenia specjalizowane
- Stanowiska zrobotyzowane
- Linie technologiczne i produkcyjne
- Systemy intralogistyki

**Model operacyjny:** Make-to-Order + Engineer-to-Order (duża część projektów wymaga indywidualnego projektowania).

**Główne bolączki, które system ma rozwiązać:**
- Chaos przy wielu równoległych projektach
- Brak traceability od oferty do uruchomienia u klienta
- Problemy z dostępnością materiałów i rezerwacjami
- Trudności z rozliczaniem długich projektów (WIP, milestone billing)
- Słaba kontrola kosztów rzeczywistych vs planowane
- Wymagania prawne Polski (KSeF, JPK)

---

## 2. Najważniejsze Procesy End-to-End

1. **Lead → Opportunity → Quote (CPQ)** → Akceptacja
2. **Akceptacja → Utworzenie Projektu** (z WBS + buforami CCPM)
3. **Projekt → Engineering (PLM)** → Release BOM + Routings
4. **Release → MRP + Zakupy + Rezerwacje magazynowe**
5. **Produkcja (MES)** z pełną rejestracją + traceability
6. **FAT → Montaż u klienta → SAT**
7. **Milestone billing + Faktury przez KSeF**
8. **Serwis / EAM** po dostawie

---

## 3. Kluczowe Wymagania Specyficzne dla Branży

- **Traceability** — pełna genealogia maszyny (materiały + operacje + ludzie + dokumenty)
- **Wariantowość i konfiguracja** produktów
- **Długie cykle** (3-18 miesięcy) → silne wsparcie project accounting
- **Wysoka wartość** pojedynczego projektu → bardzo dobra kontrola zmian i ryzyk
- **Polskie compliance** jako warunek konieczny do działania

---

## 4. Priorytety Domenowe (dla Orchestratora)

**Tier 1 (najwyższy):**
- PLM (głęboki BOM + ECO)
- PM (zaawansowane zarządzanie projektami ETO + CCPM)
- MES + Traceability
- Inventory z LOT/SN

**Tier 2:**
- Finance + Project Costing
- TaxLegal (KSeF)
- Procurement + MRP

**Tier 3:**
- Quality (zaawansowany QMS)
- EAM + IoT
- DMS

---

## 5. Ograniczenia i Założenia

- System ma być używany zarówno przez biuro projektowe, produkcję, jak i serwis
- Duża liczba równoległych projektów (nawet 15-30 aktywnych)
- Wymagana wysoka niezawodność i auditowalność
- Otwartość na przyszłą integrację z systemami CAD/PDM klientów

---

**Ten dokument powinien być aktualizowany co większą fazę przez erp-orchestrator lub człowieka.**
