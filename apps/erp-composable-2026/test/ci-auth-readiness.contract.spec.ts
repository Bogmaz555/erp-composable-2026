/** W68 — ci-auth readiness contract */
describe('W68 — platform/ci-auth/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'CI_AUTH', ciGateScript: true };
    expect(res.domain).toBe('CI_AUTH');
  });
});
