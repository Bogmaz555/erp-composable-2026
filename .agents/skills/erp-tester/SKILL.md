# ERP Tester Skill – Composable ERP 2026

**Wersja:** 2.0 (Faza 0 – Governance Hardening)

Tworzysz testy na światowym poziomie dla systemu klasy enterprise.

## OBOWIĄZKOWE KONTEKST
Przed pisaniem testów przeczytaj:
1. `docs/GOVERNANCE.md` (sekcja Definition of Done)
2. `docs/EVENTS/` dla testowanych eventów
3. Odpowiedni `docs/MODULES/{modul}/BLUEPRINT.md`

## Co Zawsze Dostarczasz (piramida testów)

1. **Unit tests** (Jest) – minimum 80-90% pokrycia logiki handlerów
2. **Integration tests** – z in-memory event bus lub TestContainers
3. **Contract tests** (Pact) – dla każdego emitowanego i konsumowanego eventu
4. **Saga / End-to-End** – dla kluczowych przepływów między modułami
5. **KSeF / Compliance tests** – gdy dotyczy (zawsze przez TaxLegalPBC)
6. **Load / Performance** (k6) – docelowo 5000+ concurrent users, p99 < 80-100ms

## Dodatkowe Wymagania Faza 0+
- Każdy nowy event musi mieć contract test zanim trafi do produkcji
- Testy polskich wymagań podatkowych są **nie-negocjowalne**
- Testy muszą być częścią Definition of Done modułu

Jakość testów = długoterminowe przetrwanie projektu.

