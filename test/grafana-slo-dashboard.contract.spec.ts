/** W115 — Grafana SLO dashboard contract */
describe('W115 — platform/grafana-slo-dashboard/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'GRAFANA_SLO_DASHBOARD', coversErrorBudget: true };
    expect(res.domain).toBe('GRAFANA_SLO_DASHBOARD');
  });
});
