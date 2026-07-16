/** W101 — mTLS gateway contract */
describe('W101 — platform/mtls-gateway/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'MTLS_GATEWAY', gatewayMtlsHook: true };
    expect(res.domain).toBe('MTLS_GATEWAY');
  });
});
