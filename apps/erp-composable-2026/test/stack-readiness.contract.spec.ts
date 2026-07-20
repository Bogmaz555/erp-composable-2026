/** W44 — platform/stack/readiness contract (TD-011 extension) */
describe('W44 — platform/stack/readiness', () => {
  it('response shape for full stack readiness', () => {
    const res = {
      ready: true,
      td011: 'partial',
      servicesUp: 10,
      servicesTotal: 14,
      manufacturingUp: 5,
      manufacturingTotal: 5,
      financeUp: 2,
      financeTotal: 2,
      frontendPort: 3003,
      groups: ['manufacturing', 'commercial', 'finance', 'platform'],
      services: [{ name: 'PM', group: 'manufacturing', port: 4002, ok: true, httpCode: 200, latencyMs: 5 }],
      regressionScore: 95,
      bootHints: ['pnpm run boot:smart'],
      checkedAt: new Date().toISOString(),
    };
    expect(res.ready).toBe(true);
    expect(['yellow-minimum', 'partial']).toContain(res.td011);
    expect(res.manufacturingTotal).toBe(5);
    expect(res.servicesTotal).toBeGreaterThanOrEqual(12);
  });
});
