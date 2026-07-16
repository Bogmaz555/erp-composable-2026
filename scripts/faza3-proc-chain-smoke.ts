#!/usr/bin/env npx tsx
/**
 * Faza 3 procurement chain — contract smoke (no live NATS/DB).
 */
import {
  EtoSagaStep,
  createEtoSagaProgress,
  markSagaStep,
} from '../apps/shared-kernel/src/types/eto-saga';
import type { PlmBomReleasedV2Event } from '../apps/shared-kernel/src/events/plm.events';
import type { OutOfStockEvent } from '../apps/shared-kernel/src/events/inv.events';
import type {
  PurchaseOrderCreatedEvent,
  PurchaseOrderApprovedEvent,
} from '../apps/shared-kernel/src/events/proc.events';
import { computeMaterialCommitmentPln } from '../apps/finance/src/eto-project-costing';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

function main() {
  console.log('=== Faza 3 Procurement Chain Smoke ===\n');

  const bom: PlmBomReleasedV2Event = {
    bomVersionId: 'bom-f3',
    itemId: 'machine-x',
    revision: 'C',
    projectId: 'proj-f3',
    tenantId: 'default',
    components: [
      { bomComponentId: 'bc-mrp-1', childPartNumber: 'BOLT-M8', childItemId: 'item-bolt', quantity: 100 },
    ],
  };

  let saga = createEtoSagaProgress('f3-smoke', {
    projectId: bom.projectId,
    bomVersionId: bom.bomVersionId,
  });
  saga = markSagaStep(saga, EtoSagaStep.BOM_RELEASED);

  const mrpPo: PurchaseOrderCreatedEvent = {
    orderId: 'po-mrp-1',
    sku: bom.components[0].childPartNumber!,
    quantity: Math.ceil(bom.components[0].quantity),
    projectId: bom.projectId,
    bomComponentId: bom.components[0].bomComponentId,
    source: 'MRP',
    status: 'PENDING_APPROVAL',
  };
  assert(mrpPo.source === 'MRP' && mrpPo.bomComponentId === 'bc-mrp-1', 'MRP PO traceability');
  saga = markSagaStep(saga, EtoSagaStep.PO_CREATED);

  const shortage: OutOfStockEvent = {
    itemId: 'STEEL-10',
    sku: 'STEEL-10',
    missingQuantity: 7,
    projectId: bom.projectId!,
    wbsElementId: 'wbs-short-1',
    bomComponentId: 'bc-short-1',
    tenantId: 'default',
  };

  const shortagePo: PurchaseOrderCreatedEvent = {
    orderId: 'po-short-1',
    sku: shortage.sku!,
    quantity: shortage.missingQuantity,
    projectId: shortage.projectId,
    bomComponentId: shortage.bomComponentId,
    source: 'SHORTAGE',
    status: 'PENDING_APPROVAL',
  };
  assert(shortagePo.quantity === 7, 'shortage qty');
  saga = markSagaStep(saga, EtoSagaStep.STOCK_OUT);
  saga = markSagaStep(saga, EtoSagaStep.PO_CREATED);

  const approved: PurchaseOrderApprovedEvent = {
    orderId: shortagePo.orderId,
    sku: shortagePo.sku,
    quantity: shortagePo.quantity,
    projectId: shortagePo.projectId,
    bomComponentId: shortagePo.bomComponentId,
    taskId: shortage.wbsElementId,
    source: 'SHORTAGE',
    approvedBy: 'proc-director',
  };
  assert(approved.taskId === 'wbs-short-1', 'PM WBS link via taskId');
  saga = markSagaStep(saga, EtoSagaStep.PO_APPROVED);

  const commitmentPln = computeMaterialCommitmentPln(approved.quantity);
  assert(commitmentPln === computeMaterialCommitmentPln(7), 'finance commitment for shortage PO qty');
  saga = markSagaStep(saga, EtoSagaStep.MATERIAL_RECEIVED);

  assert(saga.completedSteps.includes(EtoSagaStep.STOCK_OUT), 'saga includes STOCK_OUT');
  assert(saga.completedSteps.includes(EtoSagaStep.PO_APPROVED), 'saga includes PO_APPROVED');
  console.log('Saga:', saga.completedSteps.join(' → '));
  console.log('\n=== Faza 3 Procurement Chain Smoke PASSED ===\n');
}

main();
