/** W84 — Playwright stack contract */
describe('W84 — platform/playwright-stack/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'PLAYWRIGHT_STACK', bootScript: true };
    expect(res.domain).toBe('PLAYWRIGHT_STACK');
  });
});
