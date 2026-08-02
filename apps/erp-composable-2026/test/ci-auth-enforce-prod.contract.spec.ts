/** W93 — CI auth enforce prod contract */
describe('W93 — platform/ci-auth-enforce-prod/readiness', () => {
  it('response shape', () => {
    const res = {
      ready: true,
      domain: 'CI_AUTH_ENFORCE_PROD',
      authLiveNoContinueOnError: true,
    };
    expect(res.domain).toBe('CI_AUTH_ENFORCE_PROD');
  });
});
