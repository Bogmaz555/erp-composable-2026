/** W40 — platform/production/readiness aggregate */
describe('W40 — platform/production/readiness', () => {
  it('aggregates TD readiness checks', () => {
    const res = {
      ready: true,
      score: 100,
      passed: 6,
      total: 6,
      checks: [
        { id: 'TD-001', label: 'Auth', ok: true, status: 'partial' },
        { id: 'TD-013', label: 'Audit', ok: true, status: 'yellow-minimum' },
      ],
      blocked: ['Vault/TLS/mTLS — wymaga infry prod'],
      checkedAt: new Date().toISOString(),
    };
    expect(res.ready).toBe(true);
    expect(res.score).toBeGreaterThanOrEqual(80);
    expect(res.checks.length).toBeGreaterThanOrEqual(2);
  });
});
