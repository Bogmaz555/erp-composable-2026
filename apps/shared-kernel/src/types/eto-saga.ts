/**
 * Lightweight ETO saga step tracker (Faza 1B — without Temporal).
 * Used for observability and docker smoke assertions.
 */
export enum EtoSagaStep {
  BOM_RELEASED = 'plm.bom.released.v2',
  PM_WBS_EXPLODED = 'pm.wbs.exploded',
  MATERIAL_REQUESTED = 'pm.material.requested.v1',
  RESERVATION_CREATED = 'inventory.reservation.created.v1',
  WORK_ORDER_PLANNED = 'mes.workorder.planned',
  PRODUCTION_RECORDED = 'mes.production.recorded.v1',
  RESERVATION_RELEASED = 'inventory.reservation.released.v1',
  WIP_COST_RECORDED = 'finance.wip.cost.recorded',
  /** Faza 3 — Supply chain */
  STOCK_OUT = 'inv.stock.out.v1',
  PO_CREATED = 'proc.purchaseorder.created.v1',
  PO_APPROVED = 'proc.purchaseorder.approved.v1',
  MATERIAL_RECEIVED = 'proc.material.received.v1',
  QUALITY_NCR_RAISED = 'quality.ncr.raised.v1',
  QUALITY_NCR_CLOSED = 'quality.ncr.closed.v1',
  EAM_BREAKDOWN = 'eam.breakdown.detected.v1',
  EAM_MAINTENANCE = 'eam.maintenance.scheduled.v1',
}

export interface EtoSagaProgress {
  correlationId: string;
  projectId?: string;
  bomVersionId?: string;
  completedSteps: EtoSagaStep[];
  lastUpdatedAt: string;
}

export function createEtoSagaProgress(
  correlationId: string,
  partial?: Pick<EtoSagaProgress, 'projectId' | 'bomVersionId'>,
): EtoSagaProgress {
  return {
    correlationId,
    projectId: partial?.projectId,
    bomVersionId: partial?.bomVersionId,
    completedSteps: [],
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function markSagaStep(progress: EtoSagaProgress, step: EtoSagaStep): EtoSagaProgress {
  if (!progress.completedSteps.includes(step)) {
    progress.completedSteps.push(step);
  }
  progress.lastUpdatedAt = new Date().toISOString();
  return progress;
}
