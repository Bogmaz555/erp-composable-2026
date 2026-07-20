/**
 * Contract-style chain test for ETO traceability spine (Faza 1B).
 * Validates payload shapes across PLM → PM → INV → MES → Finance without live NATS/DB.
 */
import type { PlmBomReleasedV2Event } from '../apps/shared-kernel/src/events/plm.events';
import type { MesProductionRecordedV1Event } from '../apps/shared-kernel/src/events/mes.events';
import { EtoSagaStep, createEtoSagaProgress, markSagaStep } from '../apps/shared-kernel/src/types/eto-saga';
import { computeLaborCostPln } from '../apps/finance/src/eto-project-costing';

describe('ETO spine — event contract chain', () => {
  const bomReleased: PlmBomReleasedV2Event = {
    bomVersionId: 'bom-uuid',
    itemId: 'machine-item',
    revision: 'B',
    projectId: 'proj-1',
    tenantId: 'default',
    components: [
      { bomComponentId: 'comp-line-1', childItemId: 'part-a', quantity: 3 },
    ],
    releasedBy: 'engineer@eto.local',
  };

  it('plm.bom.released.v2 components carry bomComponentId for downstream BCs', () => {
    expect(bomReleased.components[0].bomComponentId).toBe('comp-line-1');
    const materialRequested = {
      projectId: bomReleased.projectId,
      wbsElementId: 'wbs-1',
      itemId: bomReleased.components[0].childItemId,
      requestedQuantity: bomReleased.components[0].quantity,
      bomComponentId: bomReleased.components[0].bomComponentId,
      tenantId: bomReleased.tenantId,
    };
    expect(materialRequested.bomComponentId).toBe('comp-line-1');
  });

  it('saga progress tracks full ETO machine build sequence', () => {
    let progress = createEtoSagaProgress('corr-1', {
      projectId: 'proj-1',
      bomVersionId: 'bom-uuid',
    });
    const steps = [
      EtoSagaStep.BOM_RELEASED,
      EtoSagaStep.PM_WBS_EXPLODED,
      EtoSagaStep.MATERIAL_REQUESTED,
      EtoSagaStep.RESERVATION_CREATED,
      EtoSagaStep.PRODUCTION_RECORDED,
      EtoSagaStep.RESERVATION_RELEASED,
      EtoSagaStep.WIP_COST_RECORDED,
    ];
    for (const step of steps) {
      progress = markSagaStep(progress, step);
    }
    expect(progress.completedSteps).toHaveLength(steps.length);
    expect(progress.completedSteps).toContain(EtoSagaStep.RESERVATION_RELEASED);
  });

  it('mes.production.recorded.v1 carries laborHours + projectId for Finance LABOR', () => {
    const mes: MesProductionRecordedV1Event = {
      workOrderId: 'wo-1',
      projectId: bomReleased.projectId,
      quantityGood: 1,
      laborHours: 4,
      bomComponentIds: [bomReleased.components[0].bomComponentId],
    };
    expect(computeLaborCostPln(mes.laborHours!)).toBe(340);
    expect(mes.bomComponentIds![0]).toBe('comp-line-1');
  });

  it('inventory.reservation.released.v1 payload preserves bomComponentId per line', () => {
    const released = {
      workOrderId: 'wo-1',
      tenantId: 'default',
      releasedReservations: [
        {
          reservationId: 'res-1',
          bomComponentId: 'comp-line-1',
          itemId: 'part-a',
          quantity: 3,
          projectId: 'proj-1',
        },
      ],
      releasedAt: new Date().toISOString(),
    };
    expect(released.releasedReservations[0].bomComponentId).toBe(
      bomReleased.components[0].bomComponentId,
    );
  });
});
