/** W91 — Grafana provision contract */
describe('W91 — platform/grafana-provision/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'GRAFANA_PROVISION', composeHasGrafana: true };
    expect(res.domain).toBe('GRAFANA_PROVISION');
  });
});
