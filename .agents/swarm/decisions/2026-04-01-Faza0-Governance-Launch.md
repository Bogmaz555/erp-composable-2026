# Decyzja: Uruchomienie Fazy 0 – Governance Hardening

**Data:** 2026-04  
**Podjęta przez:** erp-orchestrator (na bezpośrednie polecenie użytkownika: "Zrób Faza 0 teraz")

---

## Kontekst

Po głębokiej analizie repozytorium (luty/marzec 2026) stwierdzono wysokie ryzyko utraty kontekstu przy dalszej pracy autonomicznej swarmu. Poprzednie podejście "nuclear-parallel" wyprodukowało dużo szkieletów, ale zostawiło poważny dług techniczny i brak spójnych kontraktów.

Użytkownik potwierdził chęć zachowania ambitnej architektury mikroserwisowej i wyraził potrzebę **długotrwałej, czystej, automatycznej pracy** bez ciągłego pytania.

---

## Decyzja

Uruchamiamy **Fazę 0** jako priorytet absolutny przed jakąkolwiek dalszą implementacją funkcjonalności biznesowej.

Cel Fazy 0:
- Zbudować solidny, wymuszalny system governance
- Wprowadzić hierarchię agentów z rolami strażniczymi (guardian, orchestrator)
- Zdefiniować proces długotrwałych misji autonomicznych
- Zabezpieczyć projekt na 2-5 lat intensywnego rozwoju

---

## Zakres Zatwierdzony

Patrz: `MISSION-001-Faza0-Governance-Setup.md`

---

## Ryzyka Zaakceptowane

- Opóźnienie o 7-14 dni w pisaniu "nowego kodu biznesowego"
- (Ryzyko uznane za akceptowalne – bez tego dalsza praca będzie chaotyczna)

---

## Następstwa

Od tej chwili **każda** praca agentów musi odbywać się zgodnie z nowymi zasadami z `GOVERNANCE.md`.

---

*Decyzja kluczowa dla długoterminowego sukcesu projektu.*
