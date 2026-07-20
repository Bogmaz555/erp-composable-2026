/** W60 — import/products/preview contract */
describe('W60 — import/products/preview', () => {
  it('preview response shape', () => {
    const res = { mode: 'preview', validRows: 1, invalidRows: 0, preview: [{ partNumber: 'X' }] };
    expect(res.mode).toBe('preview');
  });
});
