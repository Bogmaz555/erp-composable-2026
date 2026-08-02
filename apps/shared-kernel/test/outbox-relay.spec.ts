import { Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { GenericOutboxRelay } from '../src/outbox-relay';

jest.mock('nats', () => ({
  headers: () => ({
    append: jest.fn(),
    set: jest.fn(),
  }),
}));

jest.mock('@opentelemetry/api', () => ({
  propagation: { inject: jest.fn() },
  context: { active: jest.fn(() => ({})) },
}));

jest.mock('@nestjs/microservices', () => ({
  NatsRecordBuilder: class {
    constructor(private readonly payload: unknown) {}
    setHeaders() {
      return this;
    }
    build() {
      return this.payload;
    }
  },
}));

// Factory creates mutable state (jest.mock is hoisted before consts).
jest.mock('../src/jetstream', () => {
  const state = {
    enabled: false,
    publishJsonWithAck: jest.fn(async () => ({
      stream: 'ETO_CORE',
      seq: 1,
      duplicate: false,
    })),
    connectJetStream: jest.fn(async () => ({
      nc: { drain: jest.fn(), close: jest.fn() },
      js: {},
      jsm: {},
    })),
    closeJetStream: jest.fn(async () => undefined),
  };
  (globalThis as any).__outboxJsMockState = state;
  return {
    isJetStreamEnabled: () => state.enabled,
    connectJetStream: state.connectJetStream,
    closeJetStream: state.closeJetStream,
    publishJsonWithAck: state.publishJsonWithAck,
  };
});

function jsMockState(): {
  enabled: boolean;
  publishJsonWithAck: jest.Mock;
  connectJetStream: jest.Mock;
  closeJetStream: jest.Mock;
} {
  return (globalThis as any).__outboxJsMockState;
}

type OutboxRow = {
  id: string;
  status: string;
  attempts: number;
  lastError: string | null;
  eventType: string;
  payload: unknown;
  createdAt: Date;
  lockedAt?: Date | null;
  lockedBy?: string | null;
  processedAt?: Date | null;
};

function matchesWhere(row: OutboxRow, where: any): boolean {
  if (!where) return true;
  if (where.id && row.id !== where.id) return false;
  if (where.id?.in && !where.id.in.includes(row.id)) return false;
  if (where.status && row.status !== where.status) return false;
  if (where.createdAt?.lt && !(row.createdAt < where.createdAt.lt)) return false;
  if (where.lockedAt?.lt) {
    if (row.lockedAt == null || !(row.lockedAt < where.lockedAt.lt)) return false;
  }
  if (Object.prototype.hasOwnProperty.call(where, 'lockedAt') && where.lockedAt === null) {
    if (row.lockedAt != null) return false;
  }
  if (where.OR && Array.isArray(where.OR)) {
    return where.OR.some((clause: any) => matchesWhere(row, clause));
  }
  if (where.AND && Array.isArray(where.AND)) {
    return where.AND.every((clause: any) => matchesWhere(row, clause));
  }
  return true;
}

function createPrismaMock(rows: OutboxRow[]) {
  const store = new Map(rows.map((r) => [r.id, { ...r }]));

  return {
    outboxEvent: {
      findMany: jest.fn(async ({ where, take }: any) => {
        const list = [...store.values()]
          .filter((r) => matchesWhere(r, where))
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
          .slice(0, take ?? 50);
        return list.map((r) => ({ ...r }));
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const row of store.values()) {
          if (!matchesWhere(row, where)) continue;
          Object.assign(row, data);
          count++;
        }
        return { count };
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const row = store.get(where.id);
        if (!row) throw new Error(`not found ${where.id}`);
        Object.assign(row, data);
        return { ...row };
      }),
    },
    _store: store,
  };
}

class TestRelay extends GenericOutboxRelay {
  protected readonly logger = {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
  } as unknown as Logger;

  constructor(
    protected readonly prisma: any,
    protected readonly natsClient: any,
  ) {
    super();
  }

  // Expose for direct unit tests of claim/fail helpers
  public reclaim() {
    return this.reclaimStuckProcessing();
  }

  public process(event: any) {
    return this.processEvent(event);
  }

  public fail(event: any, error: unknown) {
    return this.markPublishFailure(event, error);
  }
}

describe('GenericOutboxRelay v2', () => {
  const prevMax = process.env.OUTBOX_MAX_ATTEMPTS;
  const prevReclaim = process.env.OUTBOX_RECLAIM_MINUTES;

  afterEach(() => {
    if (prevMax === undefined) delete process.env.OUTBOX_MAX_ATTEMPTS;
    else process.env.OUTBOX_MAX_ATTEMPTS = prevMax;
    if (prevReclaim === undefined) delete process.env.OUTBOX_RECLAIM_MINUTES;
    else process.env.OUTBOX_RECLAIM_MINUTES = prevReclaim;
    const st = jsMockState();
    st.enabled = false;
    st.publishJsonWithAck.mockReset();
    st.publishJsonWithAck.mockResolvedValue({
      stream: 'ETO_CORE',
      seq: 1,
      duplicate: false,
    } as any);
    st.connectJetStream.mockClear();
    st.closeJetStream.mockClear();
    jest.clearAllMocks();
  });

  function makeEvent(overrides: Partial<OutboxRow> = {}): OutboxRow {
    return {
      id: 'evt-1',
      status: 'PENDING',
      attempts: 0,
      lastError: null,
      eventType: 'inventory.stock.reserved.v1',
      payload: { sku: 'A' },
      createdAt: new Date(),
      lockedAt: null,
      ...overrides,
    };
  }

  it('claims PENDING → PROCESSING with lockedAt=now, awaits publish, marks PROCESSED', async () => {
    const prisma = createPrismaMock([makeEvent()]);
    const natsClient = {
      emit: jest.fn(() => of(undefined)),
    };
    const relay = new TestRelay(prisma, natsClient);

    process.env.OUTBOX_RECLAIM_MINUTES = '0';
    await relay.relayEvents();

    expect(prisma.outboxEvent.updateMany).toHaveBeenCalledWith({
      where: { id: 'evt-1', status: 'PENDING' },
      data: {
        status: 'PROCESSING',
        lockedAt: expect.any(Date),
        lockedBy: expect.any(String),
      },
    });
    expect(natsClient.emit).toHaveBeenCalledWith(
      'inventory.stock.reserved.v1',
      expect.anything(),
    );
    const final = prisma._store.get('evt-1')!;
    expect(final.status).toBe('PROCESSED');
    expect(final.processedAt).toBeInstanceOf(Date);
  });

  it('on publish failure: attempts++, lastError, status stays PENDING before max', async () => {
    process.env.OUTBOX_MAX_ATTEMPTS = '5';
    process.env.OUTBOX_RECLAIM_MINUTES = '0';
    const prisma = createPrismaMock([makeEvent({ attempts: 1 })]);
    const natsClient = {
      emit: jest.fn(() => throwError(() => new Error('nats down'))),
    };
    const relay = new TestRelay(prisma, natsClient);

    await relay.relayEvents();

    const final = prisma._store.get('evt-1')!;
    expect(final.attempts).toBe(2);
    expect(final.lastError).toContain('nats down');
    expect(final.status).toBe('PENDING');
  });

  it('on publish failure after max attempts: marks FAILED (dead-letter)', async () => {
    process.env.OUTBOX_MAX_ATTEMPTS = '3';
    process.env.OUTBOX_RECLAIM_MINUTES = '0';
    const prisma = createPrismaMock([makeEvent({ attempts: 2 })]);
    const natsClient = {
      emit: jest.fn(() => throwError(() => new Error('still down'))),
    };
    const relay = new TestRelay(prisma, natsClient);

    await relay.relayEvents();

    const final = prisma._store.get('evt-1')!;
    expect(final.attempts).toBe(3);
    expect(final.status).toBe('FAILED');
    expect(final.lastError).toContain('still down');
  });

  it('skips claim when another worker already claimed the row', async () => {
    process.env.OUTBOX_RECLAIM_MINUTES = '0';
    const prisma = createPrismaMock([makeEvent()]);
    // Force lost race: first updateMany for claim returns 0
    prisma.outboxEvent.updateMany = jest.fn(async (_args?: any) => ({ count: 0 })) as any;
    const natsClient = { emit: jest.fn(() => of(undefined)) };
    const relay = new TestRelay(prisma, natsClient);

    await relay.process(makeEvent());

    expect(natsClient.emit).not.toHaveBeenCalled();
    expect(prisma.outboxEvent.update).not.toHaveBeenCalled();
  });

  it('reclaims stuck PROCESSING when lockedAt older than reclaim window', async () => {
    process.env.OUTBOX_RECLAIM_MINUTES = '10';
    // Aged backlog createdAt must NOT alone drive reclaim if lockedAt is fresh — this case:
    // old lockedAt → reclaim
    const oldLock = new Date(Date.now() - 20 * 60_000);
    const prisma = createPrismaMock([
      makeEvent({
        id: 'stuck',
        status: 'PROCESSING',
        createdAt: new Date(), // recent createdAt
        lockedAt: oldLock,
      }),
    ]);
    const relay = new TestRelay(prisma, { emit: jest.fn() });

    const count = await relay.reclaim();
    expect(count).toBe(1);
    expect(prisma._store.get('stuck')!.status).toBe('PENDING');
    expect(prisma._store.get('stuck')!.lockedAt).toBeNull();
  });

  it('does not reclaim PROCESSING with fresh lockedAt even if createdAt is old', async () => {
    process.env.OUTBOX_RECLAIM_MINUTES = '10';
    const oldCreated = new Date(Date.now() - 60 * 60_000);
    const prisma = createPrismaMock([
      makeEvent({
        id: 'fresh-lock',
        status: 'PROCESSING',
        createdAt: oldCreated,
        lockedAt: new Date(), // claim just happened
      }),
    ]);
    const relay = new TestRelay(prisma, { emit: jest.fn() });

    const count = await relay.reclaim();
    expect(count).toBe(0);
    expect(prisma._store.get('fresh-lock')!.status).toBe('PROCESSING');
  });

  it('does not reclaim recent PROCESSING with fresh lockedAt', async () => {
    process.env.OUTBOX_RECLAIM_MINUTES = '10';
    const prisma = createPrismaMock([
      makeEvent({
        id: 'fresh',
        status: 'PROCESSING',
        createdAt: new Date(),
        lockedAt: new Date(),
      }),
    ]);
    const relay = new TestRelay(prisma, { emit: jest.fn() });

    const count = await relay.reclaim();
    expect(count).toBe(0);
    expect(prisma._store.get('fresh')!.status).toBe('PROCESSING');
  });

  it('reclaims null lockedAt + aged createdAt (rollout fallback)', async () => {
    process.env.OUTBOX_RECLAIM_MINUTES = '10';
    const old = new Date(Date.now() - 20 * 60_000);
    const prisma = createPrismaMock([
      makeEvent({
        id: 'legacy',
        status: 'PROCESSING',
        createdAt: old,
        lockedAt: null,
      }),
    ]);
    const relay = new TestRelay(prisma, { emit: jest.fn() });

    const count = await relay.reclaim();
    expect(count).toBe(1);
    expect(prisma._store.get('legacy')!.status).toBe('PENDING');
  });

  it('markPublishFailure logs and does not swallow update errors with empty catch', async () => {
    process.env.OUTBOX_MAX_ATTEMPTS = '1';
    const prisma = createPrismaMock([makeEvent()]);
    prisma.outboxEvent.update = jest.fn(async (_args?: any) => {
      throw new Error('db write failed');
    }) as any;
    const relay = new TestRelay(prisma, { emit: jest.fn() });

    await relay.fail(makeEvent(), new Error('publish failed'));

    expect((relay as any).logger.error).toHaveBeenCalled();
    // Second error call for persistence failure
    const errorCalls = ((relay as any).logger.error as jest.Mock).mock.calls;
    expect(errorCalls.some((c: any[]) => String(c[0]).includes('persist outbox failure'))).toBe(
      true,
    );
  });

  it('PROCESSED DB failure after successful publish does not call markPublishFailure / DLQ', async () => {
    process.env.OUTBOX_RECLAIM_MINUTES = '0';
    process.env.OUTBOX_MAX_ATTEMPTS = '2';
    const prisma = createPrismaMock([makeEvent({ attempts: 0 })]);
    // After claim (PROCESSING), publish succeeds but PROCESSED update fails
    prisma.outboxEvent.update = jest.fn(async (_args?: any) => {
      throw new Error('db blip on PROCESSED');
    }) as any;
    const natsClient = { emit: jest.fn(() => of(undefined)) };
    const relay = new TestRelay(prisma, natsClient);

    await relay.relayEvents();

    expect(natsClient.emit).toHaveBeenCalled();
    // Still PROCESSING (claim stuck); attempts not incremented (no false DLQ path)
    const final = prisma._store.get('evt-1')!;
    expect(final.status).toBe('PROCESSING');
    expect(final.attempts).toBe(0);
    const errorCalls = ((relay as any).logger.error as jest.Mock).mock.calls;
    expect(
      errorCalls.some((c: any[]) => String(c[0]).includes('failed to mark PROCESSED')),
    ).toBe(true);
    // Must not have gone through dead-letter / retry failure messaging for publish
    expect(
      errorCalls.some((c: any[]) => String(c[0]).includes('DEAD-LETTER') || String(c[0]).includes('Failed to relay')),
    ).toBe(false);
  });

  it('when NATS_JETSTREAM on: publishJsonWithAck with msgID = outbox id (no Nest emit)', async () => {
    const st = jsMockState();
    st.enabled = true;
    process.env.OUTBOX_RECLAIM_MINUTES = '0';
    const prisma = createPrismaMock([makeEvent({ id: 'outbox-uuid-42' })]);
    const natsClient = { emit: jest.fn(() => of(undefined)) };
    const relay = new TestRelay(prisma, natsClient);

    await relay.relayEvents();

    expect(natsClient.emit).not.toHaveBeenCalled();
    expect(st.connectJetStream).toHaveBeenCalled();
    expect(st.publishJsonWithAck).toHaveBeenCalledWith(
      expect.anything(),
      'inventory.stock.reserved.v1',
      { sku: 'A' },
      expect.objectContaining({ msgID: 'outbox-uuid-42' }),
    );
    expect(prisma._store.get('outbox-uuid-42')!.status).toBe('PROCESSED');
  });

  it('when NATS_JETSTREAM on and publish fails: markPublishFailure path', async () => {
    const st = jsMockState();
    st.enabled = true;
    process.env.OUTBOX_RECLAIM_MINUTES = '0';
    process.env.OUTBOX_MAX_ATTEMPTS = '5';
    st.publishJsonWithAck.mockRejectedValueOnce(new Error('js ack timeout'));
    const prisma = createPrismaMock([makeEvent({ id: 'js-fail', attempts: 0 })]);
    const relay = new TestRelay(prisma, { emit: jest.fn() });

    await relay.relayEvents();

    const final = prisma._store.get('js-fail')!;
    expect(final.status).toBe('PENDING');
    expect(final.attempts).toBe(1);
    expect(final.lastError).toContain('js ack timeout');
  });

  it('skips overlapping relayEvents while a batch is running (reentrancy guard)', async () => {
    process.env.OUTBOX_RECLAIM_MINUTES = '0';
    const prisma = createPrismaMock([makeEvent()]);
    let resolveEmit: (() => void) | undefined;
    const emitGate = new Promise<void>((r) => {
      resolveEmit = r;
    });
    const natsClient = {
      emit: jest.fn(() => {
        // Hold first publish open so second tick overlaps
        return {
          subscribe(observer: { next?: (v: unknown) => void; complete?: () => void }) {
            void emitGate.then(() => {
              observer.next?.(undefined);
              observer.complete?.();
            });
            return { unsubscribe() {} };
          },
        };
      }),
    };
    const relay = new TestRelay(prisma, natsClient);

    const first = relay.relayEvents();
    // Allow first tick to claim and enter publish
    await new Promise((r) => setImmediate(r));
    const second = relay.relayEvents();
    await second;
    resolveEmit!();
    await first;

    // Second tick skipped — only one emit
    expect(natsClient.emit).toHaveBeenCalledTimes(1);
    expect(((relay as any).logger.debug as jest.Mock).mock.calls.some((c: any[]) =>
      String(c[0]).includes('already running'),
    )).toBe(true);
  });
});
