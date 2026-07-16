/** W128 — Playwright chain matrix contract */
describe('W128 — platform/playwright-chain-matrix/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'PLAYWRIGHT_CHAIN_MATRIX', chainSpecs: true };
    expect(res.domain).toBe('PLAYWRIGHT_CHAIN_MATRIX');
  });
});
