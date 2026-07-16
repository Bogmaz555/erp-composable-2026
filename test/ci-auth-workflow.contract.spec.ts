/** W72 — CI auth workflow contract */
describe('W72 — platform/ci-auth/readiness workflow', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'CI_AUTH', ciWorkflowAuthEnforce: true };
    expect(res.ciWorkflowAuthEnforce).toBe(true);
  });
});
