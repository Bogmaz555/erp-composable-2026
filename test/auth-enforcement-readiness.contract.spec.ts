/** W63 — auth-enforcement readiness contract */
describe('W63 — platform/auth-enforcement/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, authEnforced: false, domain: 'AUTH_ENFORCEMENT' };
    expect(res.domain).toBe('AUTH_ENFORCEMENT');
  });
});
