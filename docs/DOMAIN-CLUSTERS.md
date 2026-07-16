# ERP 2026 – Domain Clusters (Grupowanie Modułów)

Ten dokument pomaga orchestratorowi planować pracę w skupionych klastrach zamiast rozproszonego chaosu.

---

## Klaster 1: Manufacturing Core (Najwyższy Priorytet Biznesowy)

**Moduły:**
- PLM
- PM (Project Management)
- MES
- Inventory

**Dlaczego razem:**
- Największa wartość dla klienta ETO
- Najsilniejsze zależności (BOM → Projekt → Produkcja → Materiały)
- Traceability wymaga spójności tych czterech modułów

**Zalecana strategia:** Focused Cluster Mode przez 3-4 miesiące

---

## Klaster 2: Finance + Compliance (Warunek uruchomienia)

**Moduły:**
- Finance
- TaxLegal (zawsze osobny tor ze względu na ryzyko)

**Strategia:** Rozwijać równolegle z Klaster 1, ale z bardzo ścisłą kontrolą erp-compliance + guardian.

---

## Klaster 3: Supply & Quality

**Moduły:**
- Procurement
- Quality

**Zależności:** Silnie od Inventory + MES

---

## Klaster 4: Service & Aftermarket

**Moduły:**
- EAM
- IoT-AI
- DMS (Document Management)

**Zależności:** Częściowo od PLM i Finance (gwarancje, części zamienne)

---

## Klaster 5: Cross-Cutting / Wsparcie

**Moduły:**
- HR (time tracking powiązany z MES)
- Analytics
- Shared Kernel
- API Gateway + Security

---

## Rekomendacja Orchestratora

**Faza 1 (po Governance):**
- Główny fokus: **Manufacturing Core Cluster** (PLM + PM + MES + INV)
- Równolegle: **TaxLegal** (mały, ale krytyczny zespół / agent)

**Faza 2:**
- Finance + pełne integracje z TaxLegal
- Procurement + Quality

Ten sposób myślenia klastrami znacznie zmniejsza ryzyko fragmentacji.
