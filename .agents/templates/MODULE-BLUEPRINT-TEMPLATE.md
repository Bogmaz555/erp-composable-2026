# {MODULE-NAME} – Blueprint (Bounded Context)

**Kod modułu:** `{module-code}`  
**Właściciel domenowy:** `{erp-domain-owner lub człowiek}`  
**Status:** `Draft / In Progress / Stable`  
**Wersja blueprintu:** 1.0

---

## 1. Business Purpose (Po co ten moduł istnieje?)

{Jedno-dwa akapity. Jaki ból klienta rozwiązuje w kontekście produkcji jednostkowej maszyn/linii.}

---

## 2. Bounded Context Granice

### Co należy do tego kontekstu (In)
- ...
- ...

### Co zdecydowanie NIE należy (Out)
- ...
- ...

### Relacje z innymi kontekstami
| Inny moduł     | Typ relacji          | Eventy / API                          |
|----------------|----------------------|---------------------------------------|
| pm-service     | Upstream / Downstream| `...`                                 |
| ...            | ...                  | ...                                   |

---

## 3. Główne Agregaty i Encje

- `AggregateRoot1`
- `EntityX`
- ...

**Invarianty krytyczne:**
- ...

---

## 4. Kluczowe Procesy Biznesowe

1. ...
2. ...

---

## 5. Eventy Emitowane (z wersjami)

- `module.aggregate.action.v1`
- ...

---

## 6. Eventy Konsumowane

- `other-module.xxx.v1`

---

## 7. Wymagania niefunkcjonalne

- Performance
- Traceability (szczególnie ważne w ETO)
- Compliance (jeśli dotyczy)

---

## 8. Integracje Krytyczne

- Z TaxLegalPBC (jeśli dotyczy)
- Z PLM / MES / Finance

---

## 9. Otwarte Pytania / Decyzje do Podjęcia

- ...

---

**Ten dokument jest żywy.** Aktualizowany przy każdej większej zmianie domenowej razem z kodem.
