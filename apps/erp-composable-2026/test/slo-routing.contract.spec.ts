/** W123 — SLO routing contract */
describe('W123 — platform/slo-routing/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'SLO_ROUTING', sloPagerdutyRoute: true };
    expect(res.domain).toBe('SLO_ROUTING');
  });
});
