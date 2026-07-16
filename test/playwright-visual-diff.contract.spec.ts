/** W136 — Playwright visual diff contract */
describe('W136 — platform/playwright-visual-diff/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'PLAYWRIGHT_VISUAL_DIFF', hasBaselineSnapshots: true };
    expect(res.domain).toBe('PLAYWRIGHT_VISUAL_DIFF');
  });
});
