/**
 * ETO Machine Build Traceability Demo (Faza 1 Manufacturing Core)
 * 
 * This script simulates the complete end-to-end flow for building one custom machine:
 * 1. PLM: BOM released (with bomComponentId per line)
 * 2. PM + INV: WBS + Reservations created with traceability
 * 3. MES: WorkOrder + MaterialRequirements exploded
 * 4. Production: Record good qty → MaterialConsumption + AsBuilt with bomComponentId
 * 5. INV: Reservations auto-released + events emitted
 * 
 * Run with: ts-node scripts/demo-eto-machine-build-traceability.ts
 * (After pnpm install in services and when DBs are up)
 */

import { NestFactory } from '@nestjs/core';

// In real run, import from the services (would require monorepo build/linking)
// For demo: We document the exact command/event sequence that achieves full traceability.

async function runEtoDemo() {
  console.log('=== ETO Machine Build Traceability Demo ===\n');

  console.log('STEP 1: PLM releases BOM v2 with bomComponentId per component');
  console.log('  → Event: plm.bom.released.v2');
  console.log('  → Payload contains components[] with bomComponentId, childItemId, quantity\n');

  console.log('STEP 2: PM & INV react');
  console.log('  - PM: Creates WBS hierarchy linked to bomComponentId');
  console.log('  - INV: Creates Reservations with bomComponentId + StockTransaction (RESERVATION type)');
  console.log('  - Event: inventory.reservation.created.v1 emitted\n');

  console.log('STEP 3: MES receives BOM release');
  console.log('  - Creates WorkOrder linked to bomVersionId');
  console.log('  - Explodes into MaterialRequirement[] with bomComponentId\n');

  console.log('STEP 4: Production recorded');
  console.log('  Command: RecordProductionCommand(woId, goodQty)');
  console.log('  → MaterialConsumption created with bomComponentId (via CQRS command)');
  console.log('  → AsBuiltRecord created');
  console.log('  → Outbox: mes.production.recorded.v1 (includes bomComponentIds)\n');

  console.log('STEP 5: INV reacts to production');
  console.log('  → Reservations for the WO/bomComponents set to RELEASED');
  console.log('  → StockTransaction RELEASE created');
  console.log('  → Outbox: inventory.reservation.released.v1\n');

  console.log('STEP 6: Finance reacts (real ETO costing)');
  console.log('  → ProjectCost MATERIAL entries created (actual costing per bomComponent)');
  console.log('  → WipAccount updated (wipBalance incremented, materialReserved decremented)');
  console.log('  → JournalEntry WIP relief recorded\n');

  console.log('RESULT: Full forward/backward traceability for one machine:');
  console.log('  BOM Component → Reservation → Requirement → Consumption → AsBuilt → Released Event');
  console.log('  All linked by bomComponentId + tenantId + project/WO references.\n');

  console.log('To execute for real (post TD-001 full rollout):');
  console.log('1. Start docker-compose (services + NATS + DBs)');
  console.log('2. Get JWT from Keycloak for a user with Production Manager role');
  console.log('3. Call protected endpoints with Authorization: Bearer <jwt> + x-tenant-id');
  console.log('   Example: curl -H "Authorization: Bearer $JWT" -H "x-tenant-id: tenant-1" http://gateway/api/inventory');
  console.log('4. Trigger BOM release (via PLM controller or direct NATS)');
  console.log('5. Call work-orders/:id/start and /finish (now guarded in MES)');
  console.log('6. Observe full traceability + costing chain in logs + DB:');
  console.log('   - bomComponentId links across PLM → INV → MES → Finance');
  console.log('   - ProjectCost and WipAccount entries for the machine build');
  console.log('7. Protected endpoints now require valid JWT + roles (e.g. PRODUCTION_MANAGER for starting production or releasing BOMs)');
  console.log('8. Run this script for the conceptual walkthrough\n');

  console.log('=== Demo Complete - Core Manufacturing Traceability Achieved ===');

/*
 * PRACTICAL EXECUTION SNIPPET (Node.js + axios)
 * Copy-paste this when services + Keycloak are running.
 *
 * const axios = require('axios');
 *
 * const JWT = 'eyJ...';           // JWT from Keycloak (Production Manager role)
 * const TENANT = 'tenant-1';
 * const base = 'http://localhost:3000/api';
 *
 * const headers = {
 *   Authorization: `Bearer ${JWT}`,
 *   'x-tenant-id': TENANT
 * };
 *
 * async function runDemo() {
 *   // 1. Protected call (example)
 *   const inv = await axios.get(`${base}/inventory`, { headers });
 *   console.log('Inventory OK');
 *
 *   // 2. Trigger BOM release (protected)
 *   // await axios.patch(`${base}/plm/bom-versions/<id>/release`, {}, { headers });
 *
 *   // 3. Production actions (protected)
 *   // await axios.patch(`${base}/work-orders/<id>/start`, {}, { headers });
 *   // await axios.patch(`${base}/work-orders/<id>/finish`, {}, { headers });
 *
 *   // NATS listeners (INV, MES, Finance WIP) now extract x-user-id / x-roles from headers
 *   // for full end-to-end audit trail on bomComponentId traceability path (TD-001 complete in core).
 * }
 *
 * runDemo().catch(console.error);
 */
}

runEtoDemo().catch(console.error);