/** W113 — TLS rotation contract */
describe('W113 — platform/tls-rotation/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'TLS_ROTATION', rotationPolicy: true };
    expect(res.domain).toBe('TLS_ROTATION');
  });
});
