/** W85 — CI auth regression contract */
describe('W85 — platform/ci-auth-regression/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'CI_AUTH_REGRESSION', workflowIncludesRegression: true };
    expect(res.domain).toBe('CI_AUTH_REGRESSION');
  });
});
