# KARTA KONTEKSTU BIZNESOWEGO (BUSINESS CONTEXT & VALUE STREAM)
Dokument nadrzędny dla L0 Plannera. Ten plik definiuje fizyczną rzeczywistość firmy.

## 1. PROFIL PRODUKCJI I MODEL BIZNESOWY
[cite_start]Określ fundamenty działania fabryki, aby system dobrał odpowiednią architekturę danych (BOM vs Receptury) [cite: 2207-2212].

* [cite_start]**Typ produkcji:** [WYBIERZ JEDNO: Dyskretna (montaż maszyn, montaż linii produkcyjnych)] [cite: 811, 2207-2212]
* [cite_start]**Model operacyjny:** [WYBIERZ: Make-to-Order (na zamówienie) / Engineer-to-Order (projekty indywidualne)] [cite: 2044-2045]
* **Główny problem biznesowy (Pain Point):** [NP. [cite_start]chaos przy wiekszej ilości projektów,chaos na produkji i wdrożeniach, chaos w excelach, chaos w dokumentacji papierowej] [cite: 814]

## 2. SELEKCJA MODUŁÓW (PACKAGED BUSINESS CAPABILITIES)
Zaznacz [X] tylko przy modułach, które Rój ma fizycznie zbudować. [cite_start]Jeśli masz zewnętrzny system (np. do HR) i nie chcesz go zmieniać, zostaw puste[cite: 820]. Rój zignoruje odznaczone PBC.

- [X] [cite_start]**Manufacturing (MRP II / MES):** [TAK] - Planowanie i realizacja, Shop Floor[cite: 877].
- [X] [cite_start]**Inventory (WMS):** [TAK] - Magazyn, lokalizacje, kody kreskowe, traceability partii/SN[cite: 950, 953].
- [X] [cite_start]**Tax & Legal (KSeF / JPK):** [TAK] - Obowiązkowe dla Polski (faktury FA(3), znaczniki podatkowe) [cite: 988, 1000-1006].
- [X] **Finance & Accounting:** [TAK] - Księga główna, rozrachunki, integracja z bankami.
- [X] [cite_start]**Procurement (Zakupy):** [TAK] - MRP, zamówienia do dostawców, obsługa podwykonawstwa (Subcontracting)[cite: 974].
- [X] [cite_start]**Sales (Sprzedaż / CRM):** [TAK] - Oferty, zamówienia klientów (Sales Orders)[cite: 975].
- [X] [cite_start]**Quality (QMS):** [TAK] - Kontrola jakości, Six Sigma, blokowanie wadliwych partii[cite: 972].
- [X] [cite_start]**Maintenance (EAM / CMMS):** [TAK] - Utrzymanie ruchu, przeglądy, predykcja awarii[cite: 973].
- [X] [cite_start]**PLM & Engineering:** [TAK] - Zarządzanie cyklem życia, wersjonowanie BOM (Engineering Change Orders)[cite: 978].
- [X] [cite_start]**HR & Payroll:** [TAK] - Kadry, płace, rejestracja czasu pracy (zintegrowana z MES)[cite: 977, 2264].
- [X] [cite_start]**IoT & AI (Digital Twins):** [TAK] - Zbieranie danych prosto z maszyn (OPC UA / MQTT)[cite: 845, 980].

## 3. SPECYFIKA I REGUŁY TWARDE
Zdefiniuj kluczowe reguły, których L1 i L2 muszą bezwzględnie przestrzegać podczas pisania kodu.

* **Wymóg Śledzenia (Traceability):** [CZY WYMAGANE ŚLEDZENIE PARTII (LOT) LUB NUMERÓW SERYJNYCH (SN) OD DOSTAWCY DO KLIENTA? [cite_start]TAK/NIE][cite: 2053, 2207].
* **Zewnętrzne Integracje (Legacy):** [WYMIEŃ SYSTEMY ZEWNĘTRZNE, Z KTÓRYMI ERP MUSI SIĘ POŁĄCZYĆ, NP. [cite_start]"Istniejący system Comarch Optima", "Tylko KSeF i ZUS"] [cite: 842-844].
* **Kluczowy wskaźnik sukcesu (KPI):** [NP. [cite_start]terminowa realizacja projektów, wdrożenie u klienta z sukcesem, Zgodność stanów magazynowych na poziomie 99%, wystawianie faktur w < 1s, OEE maszyn][cite: 2054, 2269].