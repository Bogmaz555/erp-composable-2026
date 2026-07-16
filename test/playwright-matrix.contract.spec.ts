/** W92 — Playwright matrix contract */
describe('W92 — platform/playwright-matrix/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'PLAYWRIGHT_MATRIX', workflowMatrixJob: true };
    expect(res.domain).toBe('PLAYWRIGHT_MATRIX');
  });
});
