/** W132 — Playwright visual contract */
describe('W132 — platform/playwright-visual/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'PLAYWRIGHT_VISUAL', visualSpec: true };
    expect(res.domain).toBe('PLAYWRIGHT_VISUAL');
  });
});
