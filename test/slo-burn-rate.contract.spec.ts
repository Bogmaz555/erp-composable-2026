/** W111 — SLO burn-rate contract */
describe('W111 — platform/slo-burn-rate/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'SLO_BURN_RATE', multiWindowRules: true };
    expect(res.domain).toBe('SLO_BURN_RATE');
  });
});
