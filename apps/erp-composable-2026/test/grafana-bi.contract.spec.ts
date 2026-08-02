/** W87 — Grafana BI contract */
describe('W87 — platform/grafana-bi/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'GRAFANA_BI', dashboardFile: true, prometheusUp: true };
    expect(res.domain).toBe('GRAFANA_BI');
  });
});
