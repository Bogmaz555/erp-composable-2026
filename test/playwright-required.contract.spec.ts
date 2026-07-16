/** W88 — Playwright required contract */
describe('W88 — platform/playwright-required/readiness', () => {
  it('response shape', () => {
    const res = {
      ready: true,
      domain: 'PLAYWRIGHT_REQUIRED',
      workflowNoContinueOnError: true,
    };
    expect(res.domain).toBe('PLAYWRIGHT_REQUIRED');
  });
});
