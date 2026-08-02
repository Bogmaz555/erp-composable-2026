#!/usr/bin/env npx tsx
/**
 * CI check: Active spine event validators exist and sample payloads pass.
 * Exit 0 on success. Q1 design E1.7 / PR 1.
 */
import {
  ACTIVE_SPINE_EVENTS,
  validateEventPayload,
} from '../apps/shared-kernel/src/events/validate';

const samples: Record<string, unknown> = {
  'plm.bom.released.v2': {
    bomVersionId: 'bv',
    itemId: 'i',
    revision: 'A',
    components: [{ bomComponentId: 'bc', childItemId: 'c', quantity: 1 }],
  },
  'plm.eco.approved.v1': {
    ecoId: 'e1',
    ecoNumber: 'ECO-1',
    affectedBomVersionIds: ['bv'],
  },
  'pm.material.requested.v1': {
    projectId: 'p',
    itemId: 'i',
    requestedQuantity: 1,
    bomComponentId: 'bc',
  },
  'pm.project.released.v1': {
    projectId: 'p',
    projectName: 'N',
    productName: 'M',
    quantity: 1,
  },
  'inventory.reservation.created.v1': {
    reservationId: 'r',
    itemId: 'i',
    quantity: 1,
  },
  'inventory.reservation.released.v1': { reservationId: 'r' },
  'inv.stock.out.v1': { itemId: 'i', missingQuantity: 1, projectId: 'p', wbsElementId: 'w' },
  'mes.production.recorded.v1': { workOrderId: 'wo', quantityGood: 1 },
  'mes.workorder.completed.v1': { workOrderId: 'wo' },
  'proc.purchaseorder.created.v1': { orderId: 'po', sku: 'SKU', quantity: 1 },
  'proc.purchaseorder.approved.v1': { orderId: 'po', sku: 'SKU', quantity: 1 },
  'proc.material.received.v1': {
    purchaseOrderId: 'po',
    itemId: 'i',
    quantity: 1,
  },
};

let failed = 0;
for (const ev of ACTIVE_SPINE_EVENTS) {
  const sample = samples[ev];
  if (!sample) {
    console.error(`FAIL ${ev}: no sample payload in check-event-schemas.ts`);
    failed++;
    continue;
  }
  const r = validateEventPayload(ev, sample, { requireKnown: true });
  if (!r.ok) {
    console.error(`FAIL ${ev}: ${r.errors.join('; ')}`);
    failed++;
  } else {
    console.log(`OK   ${ev}`);
  }
}

// Negative: missing bomComponentId must fail
const neg = validateEventPayload('plm.bom.released.v2', {
  bomVersionId: 'x',
  itemId: 'y',
  revision: 'A',
  components: [{ childItemId: 'z', quantity: 1 }],
});
if (neg.ok) {
  console.error('FAIL negative: bom without bomComponentId should fail');
  failed++;
} else {
  console.log('OK   negative bomComponentId required');
}

if (failed > 0) {
  console.error(`\ncheck-event-schemas: ${failed} failure(s)`);
  process.exit(1);
}
console.log(`\ncheck-event-schemas: ${ACTIVE_SPINE_EVENTS.length} Active spine contracts OK`);
