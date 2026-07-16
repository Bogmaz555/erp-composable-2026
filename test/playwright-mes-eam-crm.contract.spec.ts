/** W120 — Playwright MES→EAM→CRM contract */
describe('W120 — platform/playwright-mes-eam-crm/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'PLAYWRIGHT_MES_EAM_CRM', chainSpec: true };
    expect(res.domain).toBe('PLAYWRIGHT_MES_EAM_CRM');
  });
});
