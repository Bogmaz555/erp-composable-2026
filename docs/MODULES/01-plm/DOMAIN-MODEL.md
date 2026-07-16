# PLM – Domain Model (Faza 1)

**Wersja:** 1.0 (po M01 start)

---

## Główne Agregaty

### Item (Aggregate Root)
- Reprezentuje każdą część, podzespół, maszynę w systemie.
- Bogate atrybuty techniczne (elastyczne przez JSON + wybrane pola indeksowane).
- Służy jako podstawa dla BOM.

### BomVersion (Aggregate Root)
- Konkretna wersja BOM dla danego Item.
- Ma status (DRAFT → RELEASED → SUPERSEDED).
- Effectivity dates na poziomie wersji.
- Zawiera listę BomComponent.

### BomComponent (Entity)
- Pozycja w BOM.
- Wskazuje na child Item.
- Ilość, pozycja, scrap, effectivity per komponent.
- Klucz do traceability.

### EngineeringChangeOrder (Aggregate Root)
- Proces zmiany inżynieryjnej.
- Lista dotkniętych BOM/Item.
- Impact analysis (na początek jako JSON summary).
- Workflow approval.

---

## Kluczowe Invarianty

- BOM nie może mieć cykli (sprawdzane przy dodawaniu komponentu).
- Po RELEASE wersji BOM, zmiany tylko przez ECO.
- Component może mieć własną effectivity (nadpisującą wersję).

---

## Integracje (Event Driven)

- Po `BomVersion` RELEASE → emit `plm.bom.released.v2` (z snapshotem komponentów).
- Po zatwierdzeniu ECO → `plm.eco.approved.v1` → konsumenci aktualizują swoje widoki.

---

**Model ten jest podstawą pod pełną traceability w Manufacturing Core.**
