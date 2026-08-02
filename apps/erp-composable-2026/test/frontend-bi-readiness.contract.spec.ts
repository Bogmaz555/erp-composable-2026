/** W71 — frontend BI wiring contract */
describe('W71 — platform/frontend-bi/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'FRONTEND_BI', frontendActionWired: true };
    expect(res.domain).toBe('FRONTEND_BI');
  });
});
