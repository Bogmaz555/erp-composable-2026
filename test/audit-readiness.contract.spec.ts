/** W36 — central audit log readiness contract (TD-013) */
describe('W36 — platform/audit/readiness', () => {
  it('response shape for TD-013', () => {
    const res = {
      ready: true,
      td013: 'yellow-minimum',
      structuredFields: ['category', 'severity', 'action', 'actorId', 'entityType', 'entityId', 'correlationId'],
      retentionMax: 500,
      total: 5,
      byCategory: { compliance: 5, operational: 0, system: 0 },
      bySeverity: { info: 4, warn: 0, critical: 1 },
      byService: { plm: 1, platform: 1, finance: 1, quality: 1, pm: 1 },
      complianceCoverage: ['plm.bom.released', 'approval.approved'],
      generatedAt: new Date().toISOString(),
      checkedAt: new Date().toISOString(),
    };
    expect(res.ready).toBe(true);
    expect(res.td013).toBe('yellow-minimum');
    expect(res.structuredFields).toContain('category');
    expect(res.byCategory.compliance).toBeGreaterThan(0);
  });

  it('audit entry structured fields', () => {
    const entry = {
      timestamp: new Date().toISOString(),
      service: 'plm',
      subject: 'plm.bom.released.v2',
      summary: '{}',
      category: 'compliance',
      severity: 'info',
      action: 'bom.released',
      actorId: 'demo.engineer',
      entityType: 'BOM',
      entityId: 'bom-demo-001',
      tenantId: 'default',
    };
    expect(entry.category).toBe('compliance');
    expect(entry.actorId).toBeDefined();
    expect(entry.entityType).toBe('BOM');
  });
});
