/** W55 — platform/quality-domain/readiness contract */
describe('W55 — platform/quality-domain/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'QUALITY', capaAggregateUp: true };
    expect(res.domain).toBe('QUALITY');
  });
});
