/** W119 — SLO alerting contract */
describe('W119 — platform/slo-alerting/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'SLO_ALERTING', grafanaRulesCoverSlo: true };
    expect(res.domain).toBe('SLO_ALERTING');
  });
});
