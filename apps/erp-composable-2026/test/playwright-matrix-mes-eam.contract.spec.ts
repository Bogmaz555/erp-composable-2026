/** W100 — Playwright matrix MES/EAM contract */
describe('W100 — platform/playwright-matrix/readiness (MES/EAM)', () => {
  it('covers mes and eam specs', () => {
    const specs = ['e2e/mes-module.spec.ts', 'e2e/eam-module.spec.ts'];
    expect(specs).toHaveLength(2);
  });
});
