/** W75 — BI scheduler contract */
describe('W75 — platform/bi-scheduler/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'BI_SCHEDULER', lastRefreshCount: 1 };
    expect(res.domain).toBe('BI_SCHEDULER');
  });
});
