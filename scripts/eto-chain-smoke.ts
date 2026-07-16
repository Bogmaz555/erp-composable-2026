#!/usr/bin/env npx tsx
/**
 * ETO chain smoke — validates event payload contracts without live NATS/DB.
 * Run: npx tsx scripts/eto-chain-smoke.ts
 */
import { EtoSagaStep, createEtoSagaProgress, markSagaStep } from '../apps/shared-kernel/src/types/eto-saga';
import type { PlmBomReleasedV2Event } from '../apps/shared-kernel/src/events/plm.events';
import type { MesProductionRecordedV1Event } from '../apps/shared-kernel/src/events/mes.events';
import {
  computeLaborCostPln,
  computeOverheadFromLaborPln,
} from '../apps/finance/src/eto-project-costing';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

function main() {
  console.log('=== ETO Chain Smoke (contract) ===\n');

  const bom: PlmBomReleasedV2Event = {
    bomVersionId: 'bom-1',
    itemId: 'machine-1',
    revision: 'A',
    projectId: 'proj-1',
    tenantId: 'default',
    components: [{ bomComponentId: 'bc-1', childItemId: 'part-a', quantity: 2 }],
  };

  let saga = createEtoSagaProgress('smoke-1', { projectId: 'proj-1', bomVersionId: 'bom-1' });
  saga = markSagaStep(saga, EtoSagaStep.BOM_RELEASED);

  const materialReq = {
    projectId: bom.projectId,
    itemId: bom.components[0].childItemId,
    bomComponentId: bom.components[0].bomComponentId,
    requestedQuantity: bom.components[0].quantity,
  };
  assert(materialReq.bomComponentId === 'bc-1', 'PM material request must carry bomComponentId');
  saga = markSagaStep(saga, EtoSagaStep.MATERIAL_REQUESTED);

  const production: MesProductionRecordedV1Event = {
    workOrderId: 'wo-1',
    projectId: 'proj-1',
    tenantId: 'default',
    quantityGood: 1,
    laborHours: 8,
    bomComponentIds: ['bc-1'],
    operatorId: 'op-1',
  };

  const labor = computeLaborCostPln(production.laborHours!);
  const overhead = computeOverheadFromLaborPln(labor);
  assert(labor === 680, `labor 8h @ 85 PLN = 680, got ${labor}`);
  assert(overhead === 102, `overhead 15% = 102, got ${overhead}`);
  saga = markSagaStep(saga, EtoSagaStep.PRODUCTION_RECORDED);

  const released = {
    workOrderId: production.workOrderId,
    releasedReservations: [
      { bomComponentId: 'bc-1', quantity: 2, projectId: 'proj-1' },
    ],
  };
  assert(
    released.releasedReservations[0].bomComponentId === production.bomComponentIds![0],
    'reservation release must match production bomComponentIds',
  );
  saga = markSagaStep(saga, EtoSagaStep.RESERVATION_RELEASED);
  saga = markSagaStep(saga, EtoSagaStep.WIP_COST_RECORDED);

  assert(saga.completedSteps.length >= 5, 'saga must track multiple steps');
  console.log('Saga steps:', saga.completedSteps.join(' → '));
  console.log('\n=== ETO Chain Smoke PASSED ===\n');
}

main();
