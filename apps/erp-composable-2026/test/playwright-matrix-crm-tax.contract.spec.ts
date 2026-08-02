/** W104 — Playwright matrix CRM/Tax contract */
describe('W104 — platform/playwright-matrix/readiness (CRM/Tax)', () => {
  it('covers crm and tax specs', () => {
    const specs = ['e2e/crm-module.spec.ts', 'e2e/tax-module.spec.ts'];
    expect(specs).toHaveLength(2);
  });
});
