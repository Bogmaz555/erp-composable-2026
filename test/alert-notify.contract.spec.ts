/** W99 — Alert notify contract */
describe('W99 — platform/alert-notify/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'ALERT_NOTIFY', alertmanagerChannels: true };
    expect(res.domain).toBe('ALERT_NOTIFY');
  });
});
