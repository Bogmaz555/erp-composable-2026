# TaxLegal – Polish Tax & Legal Compliance (Blueprint)

**Kod:** `tax-legal`  
**Status:** Draft (najwyższy priorytet compliance)  
**Wersja:** 0.1

## Business Purpose

**Jedyny moduł** w całym systemie, który może dotykać polskiego prawa podatkowego (KSeF, JPK, split payment, biała lista VAT itd.). Zgodnie z ADR-004.

## Aktualny Stan

Prawie pusty. To jest jedno z największych ryzyk całego projektu.

## Zakres Obowiązkowy (Faza 1+)

- Integracja z KSeF 2.0 (sandbox + produkcja) – faktury FA(3)
- Generowanie JPK_V7(3), JPK_KR itp.
- Obsługa split payment i mechanizmu podzielonej płatności
- Weryfikacja na białej liście VAT
- E-deklaracje ZUS
- Offline fallback (24h)

Ten moduł powinien być rozwijany równolegle z Finance od samego początku Fazy 1.
