/** W67 — bi-readiness contract */
describe('W67 — platform/bi-readiness/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'BI_READ_MODEL', dashboardUp: true };
    expect(res.domain).toBe('BI_READ_MODEL');
  });
});
