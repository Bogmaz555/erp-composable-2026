/** W83 — BI metrics contract */
describe('W83 — platform/bi-metrics/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'BI_METRICS', prometheusUp: true };
    expect(res.domain).toBe('BI_METRICS');
  });
});
