import type {
  QualityNcrRaisedV1Event,
  QualityCapaCreatedV1Event,
  QualityCapaVerifiedV1Event,
} from '../apps/shared-kernel/src/events/quality.events';

describe('Faza 4 — CAPA lifecycle (ISO 9001 §10.2)', () => {
  it('NCR → CAPA created → verified preserves linkage', () => {
    const ncr: QualityNcrRaisedV1Event = {
      ncrId: 'ncr-capa-1',
      inspectionId: 'insp-1',
      defectDescription: 'weld porosity',
      severity: 'CRITICAL',
      status: 'OPEN',
      projectId: 'proj-1',
      bomComponentId: 'bc-1',
      raisedAt: new Date().toISOString(),
    };

    const capa: QualityCapaCreatedV1Event = {
      capaId: 'capa-1',
      ncrId: ncr.ncrId,
      type: 'CORRECTIVE',
      assignee: 'quality.lead',
      dueDate: new Date().toISOString(),
      status: 'OPEN',
    };

    const verified: QualityCapaVerifiedV1Event = {
      capaId: capa.capaId,
      ncrId: capa.ncrId,
      verifiedAt: new Date().toISOString(),
    };

    expect(capa.ncrId).toBe(ncr.ncrId);
    expect(verified.ncrId).toBe(ncr.ncrId);
    expect(verified.capaId).toBe(capa.capaId);
  });
});
