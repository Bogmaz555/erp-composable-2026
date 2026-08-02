import {
  ACTIVE_SPINE_EVENTS,
  assertValidEventPayload,
  validateEventPayload,
  validatePlmBomReleasedV2,
} from '../src/events/validate';

describe('event schema contracts (Q1)', () => {
  it('lists 12 Active spine events', () => {
    expect(ACTIVE_SPINE_EVENTS.length).toBe(12);
  });

  it('accepts valid plm.bom.released.v2', () => {
    const r = validatePlmBomReleasedV2({
      bomVersionId: 'bv-1',
      itemId: 'item-1',
      revision: 'A',
      components: [
        { bomComponentId: 'bc-1', childItemId: 'c-1', quantity: 2 },
      ],
    });
    expect(r.ok).toBe(true);
  });

  it('rejects bom release without bomComponentId', () => {
    const r = validatePlmBomReleasedV2({
      bomVersionId: 'bv-1',
      itemId: 'item-1',
      revision: 'A',
      components: [{ childItemId: 'c-1', quantity: 1 }],
    });
    expect(r.ok).toBe(false);
  });

  it('validateEventPayload routes by type', () => {
    const ok = validateEventPayload('pm.project.released.v1', {
      projectId: 'p1',
      projectName: 'ETO Machine',
    });
    expect(ok.ok).toBe(true);
    const bad = validateEventPayload('mes.production.recorded.v1', { quantityGood: 1 });
    expect(bad.ok).toBe(false);
  });

  it('assertValidEventPayload throws on violation', () => {
    expect(() =>
      assertValidEventPayload('inv.stock.out.v1', { foo: 1 }),
    ).toThrow(/Event schema violation/);
  });
});
