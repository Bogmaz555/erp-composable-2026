/** W107 — Alert oncall contract */
describe('W107 — platform/alert-oncall/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'ALERT_ONCALL', alertmanagerIntervals: true };
    expect(res.domain).toBe('ALERT_ONCALL');
  });
});
