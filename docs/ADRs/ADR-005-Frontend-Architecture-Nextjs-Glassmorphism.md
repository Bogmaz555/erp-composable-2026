# ADR-005: Frontend Architecture – Next.js 15 + Glassmorphism + Existing Design Preservation

**Status:** Akceptowany  
**Data:** 2026-04

---

## Kontekst

Frontend musi być nowoczesny, ergonomiczny dla użytkowników produkcyjnych i spójny wizualnie, przy jednoczesnym zachowaniu wysokiej produktywności developmentu (szczególnie przy pracy agentów AI).

---

## Decyzja

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styl:** Ciemny Glassmorphism (Tailwind + istniejąca paleta indigo/emerald/amber/rose)
- **State Management:** TanStack Query (primary) + Zustand / local state gdzie potrzeba
- **Zasada kluczowa:** "Preserve Existing Logic" – nigdy nie niszczymy istniejących hooków, memoizacji, komponentów bez wyraźnego powodu i ADR

---

## Szczegółowe Reguły

1. **Zero `window.location.reload()`** – zawsze rewalidacja przez TanStack Query lub dedykowane fetch functions.
2. **Maksymalna memoizacja** KPI, agregacji, kosztownych obliczeń (`useMemo`).
3. **Szklane panele** (`glass-panel`, `backdrop-blur`) jako dominujący wzorzec UI.
4. **Drawers zamiast modal** dla detali (zgodne z Best Practices).
5. Komponenty budujemy jako rozszerzenie istniejącego systemu, nie od zera.

---

## Uzasadnienie

- Obecny frontend już ma bardzo dobrą jakość wizualną i ergonomię (duża wartość przy demo)
- Zachowanie spójności jest ważniejsze niż "ulepszanie" przy każdej okazji
- Agentom łatwiej pracować, gdy mają jasne reguły "nie ruszaj tego co działa"

---

## Powiązane

- `specs/ERP_Best_Practices_and_Standards.md`
- GOVERNANCE.md → sekcja "Never Break Existing Logic"
