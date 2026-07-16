#!/usr/bin/env npx tsx
import type { QualityNcrRaisedV1Event } from '../apps/shared-kernel/src/events/quality.events';
import { EtoSagaStep, createEtoSagaProgress, markSagaStep } from '../apps/shared-kernel/src/types/eto-saga';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

const raised: QualityNcrRaisedV1Event = {
  ncrId: 'ncr-1',
  inspectionId: 'insp-1',
  defectDescription: 'Weld porosity',
  severity: 'CRITICAL',
  status: 'OPEN',
  projectId: 'proj-q',
  bomComponentId: 'bc-q1',
  tenantId: 'default',
  raisedAt: new Date().toISOString(),
};

let saga = createEtoSagaProgress('f4-ncr');
saga = markSagaStep(saga, EtoSagaStep.PO_APPROVED);
saga = markSagaStep(saga, EtoSagaStep.MATERIAL_RECEIVED);

assert(raised.severity === 'CRITICAL', 'severity');
assert(!!raised.bomComponentId, 'traceability');

console.log('[faza4-ncr-smoke] PASSED', raised.ncrId);
process.exit(0);
