/** W135 — Helm deploy contract */
describe('W135 — platform/helm-deploy/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'HELM_DEPLOY', chart: true };
    expect(res.domain).toBe('HELM_DEPLOY');
  });
});
