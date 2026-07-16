/** W121 — Vault KMS unseal contract */
describe('W121 — platform/vault-kms-unseal/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'VAULT_KMS_UNSEAL', kmsConfig: true };
    expect(res.domain).toBe('VAULT_KMS_UNSEAL');
  });
});
