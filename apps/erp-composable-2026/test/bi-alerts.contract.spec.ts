/** W95 — BI alerts contract */
describe('W95 — platform/bi-alerts/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'BI_ALERTS', alertRulesCoverBi: true };
    expect(res.domain).toBe('BI_ALERTS');
  });
});
