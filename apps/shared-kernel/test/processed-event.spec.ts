import {
  resolveEventId,
  withProcessedEventGuard,
  wasProcessed,
  markProcessed,
} from '../src/processed-event';

function makePrisma() {
  const rows = new Map<string, { eventId: string; consumer: string }>();
  const key = (e: string, c: string) => `${e}::${c}`;
  return {
    processedEvent: {
      findFirst: async ({ where }: { where: { eventId: string; consumer: string } }) => {
        return rows.get(key(where.eventId, where.consumer)) ?? null;
      },
      findUnique: async ({
        where,
      }: {
        where: { eventId_consumer: { eventId: string; consumer: string } };
      }) => {
        const { eventId, consumer } = where.eventId_consumer;
        return rows.get(key(eventId, consumer)) ?? null;
      },
      create: async ({
        data,
      }: {
        data: { eventId: string; consumer: string; processedAt?: Date };
      }) => {
        const k = key(data.eventId, data.consumer);
        if (rows.has(k)) {
          const err = new Error('Unique constraint failed') as Error & { code: string };
          err.code = 'P2002';
          throw err;
        }
        const row = { eventId: data.eventId, consumer: data.consumer };
        rows.set(k, row);
        return row;
      },
    },
    _rows: rows,
  };
}

describe('processed-event', () => {
  it('resolveEventId prefers msgId then headers', () => {
    expect(resolveEventId({ msgId: 'a', eventId: 'b' })).toBe('a');
    expect(
      resolveEventId({
        headers: { 'x-outbox-id': 'out-1' },
      }),
    ).toBe('out-1');
    expect(resolveEventId({ correlationId: 'c1' })).toBe('c1');
    expect(resolveEventId({})).toBeNull();
  });

  it('wasProcessed / markProcessed round-trip', async () => {
    const prisma = makePrisma();
    expect(await wasProcessed(prisma as any, { eventId: 'e1', consumer: 'c1' })).toBe(
      false,
    );
    expect(await markProcessed(prisma as any, { eventId: 'e1', consumer: 'c1' })).toBe(
      true,
    );
    expect(await wasProcessed(prisma as any, { eventId: 'e1', consumer: 'c1' })).toBe(
      true,
    );
    expect(await markProcessed(prisma as any, { eventId: 'e1', consumer: 'c1' })).toBe(
      false,
    );
  });

  it('withProcessedEventGuard runs once', async () => {
    const prisma = makePrisma();
    let n = 0;
    const r1 = await withProcessedEventGuard(prisma as any, { eventId: 'e', consumer: 'h' }, async () => {
      n += 1;
      return 'ok';
    });
    const r2 = await withProcessedEventGuard(prisma as any, { eventId: 'e', consumer: 'h' }, async () => {
      n += 1;
      return 'again';
    });
    expect(r1).toEqual({ idempotent: false, result: 'ok' });
    expect(r2).toEqual({ idempotent: true });
    expect(n).toBe(1);
  });
});
