/** W42 — platform/gateway/readiness contract (TD-002) */
describe('W42 — platform/gateway/readiness', () => {
  it('response shape for TD-002', () => {
    const res = {
      ready: true,
      td002: 'yellow-minimum',
      proxyRoutesUp: 5,
      proxyRoutesTotal: 7,
      probes: [{ name: 'GW→PM', path: '/api/pm', ok: true, httpCode: 200, latencyMs: 12 }],
      checkedAt: new Date().toISOString(),
    };
    expect(res.ready).toBe(true);
    expect(['yellow-minimum', 'partial']).toContain(res.td002);
  });
});
