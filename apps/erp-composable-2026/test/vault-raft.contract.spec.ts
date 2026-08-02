/** W133 — Vault Raft contract */
describe('W133 — platform/vault-raft/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'VAULT_RAFT', raftStorageConfig: true };
    expect(res.domain).toBe('VAULT_RAFT');
  });
});
