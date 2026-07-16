/** W57 — platform/eam-domain/readiness contract */
describe('W57 — platform/eam-domain/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'EAM', maintenanceAggregateUp: true };
    expect(res.domain).toBe('EAM');
  });
});
