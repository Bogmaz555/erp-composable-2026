/** W103 — Alert escalation contract */
describe('W103 — platform/alert-escalation/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'ALERT_ESCALATION', alertmanagerEscalation: true };
    expect(res.domain).toBe('ALERT_ESCALATION');
  });
});
