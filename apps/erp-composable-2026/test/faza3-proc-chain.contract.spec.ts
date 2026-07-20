import type { OutOfStockEvent } from '../apps/shared-kernel/src/events/inv.events';
import type { PurchaseOrderApprovedEvent } from '../apps/shared-kernel/src/events/proc.events';
import { EtoSagaStep, createEtoSagaProgress, markSagaStep } from '../apps/shared-kernel/src/types/eto-saga';

describe('Faza 3 — INV shortage → PROC → PM', () => {
  it('inv.stock.out.v1 maps to PO with bomComponentId and PM taskId on approve', () => {
    const stockOut: OutOfStockEvent = {
      itemId: 'PART-99',
      sku: 'PART-99',
      missingQuantity: 4,
      projectId: 'proj-99',
      wbsElementId: 'wbs-elem-99',
      bomComponentId: 'bc-99',
      tenantId: 'default',
    };

    const poCreated = {
      orderId: 'po-99',
      sku: stockOut.sku,
      quantity: stockOut.missingQuantity,
      projectId: stockOut.projectId,
      bomComponentId: stockOut.bomComponentId,
      source: 'SHORTAGE' as const,
    };

    const approved: PurchaseOrderApprovedEvent = {
      ...poCreated,
      taskId: stockOut.wbsElementId,
      approvedBy: 'buyer@eto.local',
    };

    let saga = createEtoSagaProgress('f3-contract');
    saga = markSagaStep(saga, EtoSagaStep.STOCK_OUT);
    saga = markSagaStep(saga, EtoSagaStep.PO_CREATED);
    saga = markSagaStep(saga, EtoSagaStep.PO_APPROVED);

    expect(approved.taskId).toBe('wbs-elem-99');
    expect(approved.bomComponentId).toBe('bc-99');
    expect(saga.completedSteps).toContain(EtoSagaStep.PO_APPROVED);
  });
});
