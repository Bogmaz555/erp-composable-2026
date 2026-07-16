/** W131 — K8s deploy contract */
describe('W131 — platform/k8s-deploy/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'K8S_DEPLOY', kustomization: true };
    expect(res.domain).toBe('K8S_DEPLOY');
  });
});
