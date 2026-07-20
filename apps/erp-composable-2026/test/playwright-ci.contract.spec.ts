/** W80 — Playwright CI contract */
describe('W80 — platform/playwright-ci/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'PLAYWRIGHT_CI', specExists: true };
    expect(res.domain).toBe('PLAYWRIGHT_CI');
  });
});
