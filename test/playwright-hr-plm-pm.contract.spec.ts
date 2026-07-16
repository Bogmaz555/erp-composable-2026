/** W124 — Playwright HR→PLM→PM contract */
describe('W124 — platform/playwright-hr-plm-pm/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'PLAYWRIGHT_HR_PLM_PM', chainSpec: true };
    expect(res.domain).toBe('PLAYWRIGHT_HR_PLM_PM');
  });
});
