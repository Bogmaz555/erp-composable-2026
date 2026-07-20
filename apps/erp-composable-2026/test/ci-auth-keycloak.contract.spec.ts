/** W89 — CI auth Keycloak contract */
describe('W89 — platform/ci-auth-keycloak/readiness', () => {
  it('response shape', () => {
    const res = {
      ready: true,
      domain: 'CI_AUTH_KEYCLOAK',
      workflowIncludesKeycloak: true,
    };
    expect(res.domain).toBe('CI_AUTH_KEYCLOAK');
  });
});
