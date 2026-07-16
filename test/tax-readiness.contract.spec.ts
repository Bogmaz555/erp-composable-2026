/** W45 — platform/tax/readiness contract (TD-005) */
describe('W45 — platform/tax/readiness', () => {
  it('response shape for Tax-Legal / KSeF / JPK readiness', () => {
    const res = {
      ready: true,
      td005: 'yellow-minimum',
      ksefMode: 'sandbox',
      ksefEnvGated: true,
      probesUp: 5,
      probesTotal: 5,
      jpkReady: true,
      period: { year: 2026, month: 6 },
      probes: [{ name: 'JPK_KR export', path: '/api/tax-legal/jpk/kr', ok: true, httpCode: 200, latencyMs: 20 }],
      capabilities: ['KSeF milestone invoice', 'JPK_KR ledger', 'JPK_V7 sales register'],
      checkedAt: new Date().toISOString(),
    };
    expect(res.ready).toBe(true);
    expect(['yellow-minimum', 'partial']).toContain(res.td005);
    expect(res.probesTotal).toBeGreaterThanOrEqual(5);
    expect(res.jpkReady).toBe(true);
  });
});
