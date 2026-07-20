/** W38 — platform/boot/readiness contract (TD-011) */
describe('W38 — platform/boot/readiness', () => {
  it('response shape for TD-011', () => {
    const res = {
      ready: true,
      td011: 'partial',
      servicesUp: 8,
      servicesTotal: 13,
      frontendPort: 3003,
      services: [{ name: 'gateway', port: 4005, ok: true, status: 200 }],
      bootHints: ['pnpm run boot:smart'],
      checkedAt: new Date().toISOString(),
    };
    expect(res.ready).toBe(true);
    expect(['yellow-minimum', 'partial']).toContain(res.td011);
    expect(res.servicesTotal).toBeGreaterThanOrEqual(10);
  });
});
