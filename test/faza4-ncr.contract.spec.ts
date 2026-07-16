import type { QualityNcrRaisedV1Event } from '../apps/shared-kernel/src/events/quality.events';

describe('Faza 4 — quality.ncr.raised.v1', () => {
  it('carries project and bom traceability for PM hold', () => {
    const evt: QualityNcrRaisedV1Event = {
      ncrId: 'n1',
      inspectionId: 'i1',
      defectDescription: 'dim out of tol',
      severity: 'HIGH',
      status: 'OPEN',
      projectId: 'p1',
      bomComponentId: 'bc-1',
      raisedAt: new Date().toISOString(),
    };
    expect(evt.projectId).toBeDefined();
    expect(evt.bomComponentId).toBe('bc-1');
  });
});
