# ERP Best Practices and Standards 2026

## 1. Wytyczne Interfejsu Użytkownika (UI/UX)
- **Styl:** Mroczny Glassmorphism (Dark Mode). Używamy palety Tailwind: `slate` dla tła i paneli, `indigo` dla akcentów głównych, oraz `emerald`/`amber`/`rose` dla statusów.
- **Komponenty Szuflad (Drawers):** Bezwzględnie unikamy klasycznych modali blokujących ekran. Rozszerzone widoki (np. detale projektu) otwierają się jako wysuwane z prawej strony panele (Slide-over) z klasą `backdrop-blur`.
- **Zarządzanie Stanem (UX):** Używanie polecenia `window.location.reload()` jest SUROWO ZABRONIONE. Wszystkie odświeżenia danych muszą korzystać z wyodrębnionych funkcji pobierających (np. `fetchOpportunities()`) owiniętych w `useCallback`.

## 2. Standardy Kodu (Clean Code)
- **Frontend (Next.js):** - Obowiązkowe użycie `useMemo` do kosztownych obliczeń KPI i agregacji danych.
  - Kod formatujący (np. funkcje dla walut) nie może być nadpisywany ani usuwany przez nowe aktualizacje.
- **Backend (NestJS / API Routes):** - Rozdział warstw (Clean Architecture). API Controllers służą wyłącznie do odbierania żądań i walidacji JSON. Główna logika jest w handlerach.
- **Testowanie:** Cel: 90% pokrycia kodem dla testów jednostkowych (Jest) i wydajnościowych (k6 dla symulacji >5000 użytkowników).

## 3. Agent Guardrails (Wytyczne dla Autonomicznego Roju)
- **Weryfikacja Modeli:** Zawsze sprawdzaj model bazy danych (`schema.prisma` lub pliki konfiguracyjne NestJS) przed napisaniem logiki aplikacyjnej.
- **Cykl Życia Bazy Danych:** Jeśli schemat Prisma (`schema.prisma`) został zmodyfikowany przez Agenta, ma on BEZWZGLĘDNY OBOWIĄZEK samodzielnie uruchomić `npx prisma db push` oraz `npx prisma generate` w konsoli zanim przystąpi do dalszej pracy.
- **Zasada Zachowania Istniejącej Logiki:** Nigdy nie usuwaj działających optymalizacji (hooki React) ani systemów (np. wielowalutowość, oś czasu), jeśli cel biznesowy wprost tego nie wymaga.
- **Iteracje:** Działaj małymi, chirurgicznymi krokami (Max 3-4 modyfikowane pliki na jedną operację).