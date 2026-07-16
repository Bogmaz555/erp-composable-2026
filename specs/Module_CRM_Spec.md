# Moduł CRM – Kompletna Specyfikacja (ETO/MTO Best Practices 2026)

## 1. Zarządzanie leadami i widok 360° klienta
- Pełna kartoteka kontrahenta powiązana z obiektem `Opportunity`.
- **Oś Czasu (Timeline / Activity):** Rejestracja zdarzeń, notatek, logów e-mail bezpośrednio w Szufladzie (Drawer) projektu.
- **Wielowalutowość (Native):** Każda Szansa Sprzedaży posiada własną, niezależną walutę (PLN, EUR, USD), zapisaną bezpośrednio w modelu `Opportunity` w bazie danych, eliminując błędy przeliczeniowe.

## 2. Zaawansowany lejek sprzedażowy ETO (Pipeline)
- Interaktywny Kanban z natywnym mechanizmem Drag & Drop (HTML5) oraz Optimistic UI (natychmiastowa reakcja interfejsu przed odpowiedzią serwera).
- **8 Etapów Lejka (Strict):**
  1. `NEW` (Nowe zapytanie)
  2. `WAITING_VISIT` (Oczekuje na wizytę / Analizę)
  3. `TECH_DRAFT` (Oczekuje na koncepcję techniczną)
  4. `QUOTING` (W trakcie wyceny)
  5. `OFFER_SENT` (Wysłana oferta)
  6. `CLIENT_SIDE` (Oczekuje po stronie klienta)
  7. `NEGOTIATION` (Negocjacje)
  8. `ACCEPTED` (Wygrane - automatycznie wyzwala Event "Handover" na szynę Kafka do Modułu PM)

## 3. CPQ – Konfigurator i Baza Maszyn
- Dynamiczny konfigurator sprzężony z bazą danych (Produkty i Moduły pobierane z DB `ProductCatalog`, a nie z hardkodowanych tablic).
- Kalkulacja kosztów w czasie rzeczywistym z uwzględnieniem narzutów inżynieryjnych i produkcyjnych.
- Strefa "Dropzone" w Szufladzie do przechowywania zapytań PDF oraz załączników CAD.

## 4. Executive Analytics & Strategic Insights (Dla Zarządu)
**Cel:** Jeden dedykowany widok „Executive Sales Dashboard” – single source of truth dla Zarządu i C-level. Dostęp read-only, z AI insights.

**Kluczowe KPI i metryki:**
- **Revenue & Forecast:** YTD revenue vs plan, Pipeline coverage ratio, Weighted pipeline value.
- **Efektywność i konwersja:** Win rate (ogólny + trend), Average deal size, Sales cycle length.
- **Strategic insights:** Plany roczne vs realizacja, AI anomaly detection (np. "Spadek marż w Q2").

**Wymagania Techniczne UI:** Jeden główny dashboard z 6–8 kartami KPI zabezpieczony przez `useMemo`, eliminujący zbędne przeliczenia przy zmianie waluty lub re-renderach.