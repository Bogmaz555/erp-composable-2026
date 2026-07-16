# ADR-004: Polish Compliance Isolation (TaxLegalPBC jako jedyny źródło prawdy podatkowej)

**Status:** Akceptowany  
**Data:** 2026-04

---

## Kontekst

Polskie przepisy podatkowe (KSeF 2.0, JPK_V7(3), split payment, biała lista VAT, JPK_KR, e-deklaracje ZUS itp.) są bardzo złożone, często się zmieniają i niosą wysokie ryzyko kar.

---

## Decyzja

**Tylko moduł `tax-legal` (TaxLegalPBC) może:**

- Generować faktury w formacie KSeF FA(3)
- Komunikować się z API KSeF
- Generować pliki JPK
- Implementować logikę split payment, białej listy, OSS/IOSS itp.

Żaden inny moduł (Finance, CRM, Procurement, MES...) **nie może** zawierać żadnej logiki podatkowej ani bezpośrednio wywoływać KSeF.

---

## Uzasadnienie

- Izolacja ryzyka prawnego i kar finansowych
- Możliwość łatwej aktualizacji przy zmianach prawa (tylko jeden moduł)
- Łatwiejsze audyty i certyfikacje

---

## Konsekwencje

- Wszystkie inne moduły operują na pojęciach biznesowych ("PaymentMilestone", "InvoiceReference", "TaxAmount")
- TaxLegalPBC subskrybuje odpowiednie eventy i zwraca statusy/projekcje
- Finance może widzieć tylko "faktura wystawiona / nie" przez eventy z TaxLegal

---

## Powiązane

- erp-compliance skill (ma obowiązek pilnować tej reguły)
- Wszystkie eventy związane z fakturami i płatnościami muszą przechodzić przez ten filtr
