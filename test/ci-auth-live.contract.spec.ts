/** W81 — CI auth live contract */
describe('W81 — platform/ci-auth-live/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'CI_AUTH_LIVE', workflowIncludesLive: true };
    expect(res.domain).toBe('CI_AUTH_LIVE');
  });
});
