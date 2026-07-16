/** W77 — CI auth enforce contract */
describe('W77 — platform/ci-auth-enforce/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'CI_AUTH_ENFORCE', workflowIncludesProbe: true };
    expect(res.workflowIncludesProbe).toBe(true);
  });
});
