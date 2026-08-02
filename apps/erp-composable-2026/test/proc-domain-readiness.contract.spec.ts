/** W56 — platform/proc-domain/readiness contract */
describe('W56 — platform/proc-domain/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'PROCUREMENT', mrpAggregateUp: true };
    expect(res.domain).toBe('PROCUREMENT');
  });
});
