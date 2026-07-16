#!/usr/bin/env npx tsx
/**
 * Seed Faza 2 demo data (documented SQL — run when DBs are up).
 * CostRate global LABOR 95 PLN/h, demo employee for HR time entries.
 */
console.log(`
=== Faza 2 Seed (manual prisma / SQL) ===

Finance (fin-db :5438):
  INSERT INTO "CostRate" (id, "tenantId", "costType", "rateValue", unit)
  VALUES (gen_random_uuid(), 'default', 'LABOR', 95, 'HOUR');

HR (hr-db :5443):
  INSERT INTO "Employee" (id, "badgeId", "firstName", "lastName", "hourlyRate")
  VALUES (gen_random_uuid(), 'OP-001', 'Jan', 'Kowalski', 72.5);

PM milestone test (via gateway):
  POST /api/pm/projects/{id}/milestones/FAT/reach
  Body: { "amount": 400000, "percent": 40 }

HR time entry:
  POST /api/hr/time-entries
  Body: { "employeeId": "<uuid>", "projectId": "<uuid>", "hours": 8 }
`);
