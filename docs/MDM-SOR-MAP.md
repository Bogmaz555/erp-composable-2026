# MDM System of Record Map (Enterprise Q4)

| Entity | SoR service | Canonical id | Consumers (read) | Write path |
|--------|-------------|--------------|------------------|------------|
| Product / Item / BOM | **plm-service** | `itemId` / `bomVersionId` | inv, pm, crm, mes | PLM only |
| Business Partner | **crm-service** | `partnerId` | proc, finance, tax | CRM only |
| Project / WBS / Task | **pm-service** | `projectId` | inv, mes, finance, dms | PM only |
| Stock / Reservation | **inv-service** | `reservationId` | pm, mes, proc | INV only |
| Work Order | **mes-service** | `workOrderId` | quality, finance | MES only |
| Journal / WIP | **finance** | `journalEntryId` | analytics | Finance only |
| NCR / CAPA | **quality-service** | `ncrId` / `capaId` | mes, eam | Quality only |
| Document | **dms** | `documentId` | pm, plm | DMS only |

## Rules

1. **No dual-write** of SoR fields across services.  
2. Cross-service updates = **events only** (JetStream).  
3. UI resolves labels via SoR GET; foreign keys store SoR ids only.  
4. Runtime map: `GET /api/mdm/sor` (gateway static JSON).

## Anti-patterns (forbidden)

- Frontend inventing product master outside PLM  
- Finance creating project rows  
- INV mutating partner master  
