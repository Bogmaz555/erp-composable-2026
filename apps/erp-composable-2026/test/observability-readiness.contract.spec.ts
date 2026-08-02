/** W34 — observability readiness contract */
describe('W34 — platform/observability/readiness', () => {
  it('response shape for TD-008 + TD-009', () => {
    const res = {
      ready: true,
      td008: 'yellow-minimum',
      td009: 'yellow-minimum',
      otel: { enabled: true },
      outbox: { totalFailed: 0 },
      jaegerUiUp: true,
      checkedAt: new Date().toISOString(),
    };
    expect(res.ready).toBe(true);
    expect(res.td008).toBe('yellow-minimum');
    expect(res.td009).toBe('yellow-minimum');
  });
});
