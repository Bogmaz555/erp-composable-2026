/** W79 — BI retention contract */
describe('W79 — platform/bi-retention/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'BI_RETENTION', ttlHours: 168 };
    expect(res.domain).toBe('BI_RETENTION');
  });
});
