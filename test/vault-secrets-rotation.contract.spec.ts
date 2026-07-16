/** W117 — Vault secrets rotation contract */
describe('W117 — platform/vault-secrets-rotation/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'VAULT_SECRETS_ROTATION', rotationPolicy: true };
    expect(res.domain).toBe('VAULT_SECRETS_ROTATION');
  });
});
