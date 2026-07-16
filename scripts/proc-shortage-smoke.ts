/**
 * Smoke: INV shortage payload → canonical inv.stock.out.v1 shape (no live NATS required).
 */
import type { OutOfStockEvent } from '../apps/shared-kernel/src/events/inv.events';

function buildProcPoPayload(evt: OutOfStockEvent & { sku?: string; tenantId?: string }) {
  return {
    sku: evt.sku || evt.itemId,
    quantity: evt.missingQuantity,
    projectId: evt.projectId,
    bomComponentId: evt.bomComponentId,
    source: 'SHORTAGE' as const,
    taskId: evt.wbsElementId,
    tenantId: evt.tenantId || 'default',
  };
}

const sample: OutOfStockEvent = {
  itemId: 'STEEL-10MM',
  sku: 'STEEL-10MM',
  missingQuantity: 12,
  projectId: 'ETO-2026-001',
  wbsElementId: 'WBS-MECH-01',
  bomComponentId: 'bc-uuid-1',
  tenantId: 'default',
};

const po = buildProcPoPayload(sample);
const ok =
  po.sku === 'STEEL-10MM' &&
  po.quantity === 12 &&
  po.source === 'SHORTAGE' &&
  po.bomComponentId === 'bc-uuid-1';

console.log('[proc-shortage-smoke]', ok ? 'PASSED' : 'FAILED', po);
process.exit(ok ? 0 : 1);
