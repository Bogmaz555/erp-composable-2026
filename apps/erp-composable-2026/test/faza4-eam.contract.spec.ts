import type { EamBreakdownDetectedV1Event } from '../apps/shared-kernel/src/events/eam.events';

describe('Faza 4 — eam.breakdown.detected.v1', () => {
  it('payload supports PM project link', () => {
    const evt: EamBreakdownDetectedV1Event = {
      equipmentId: 'eq-1',
      reason: 'bearing failure',
      severity: 'CRITICAL',
      detectedAt: new Date().toISOString(),
      projectId: 'proj-eto',
    };
    expect(evt.projectId).toBe('proj-eto');
    expect(evt.severity).toBe('CRITICAL');
  });
});
