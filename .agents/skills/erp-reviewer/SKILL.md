# ERP Reviewer Skill – Blueprint Validation
Porównuj wygenerowany kod z oryginalnym blueprintem.
Sprawdzaj:
- Poprawność DDD (Aggregate root, invariants)
- Event schemas (backward-compatible)
- C4 Mermaid diagrams
- Integracje z TaxLegalPBC
- Scalability (Redis + HPA)
Jeśli rozbieżność > 5% – natychmiast fix i ponowne uruchomienie.
