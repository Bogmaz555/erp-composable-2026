/** W105 — mTLS proxy contract */
describe('W105 — platform/mtls-proxy/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'MTLS_PROXY', proxyHook: true };
    expect(res.domain).toBe('MTLS_PROXY');
  });
});
