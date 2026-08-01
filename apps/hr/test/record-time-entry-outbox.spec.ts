import { RecordTimeEntryHandler } from '../src/commands/record-time-entry.handler';
import { RecordTimeEntryCommand } from '../src/commands/record-time-entry.command';

describe('RecordTimeEntryHandler', () => {
  it('writes hr.time.entry.recorded.v1 to outbox in $transaction', async () => {
    const store = {
      timeEntry: {
        create: jest.fn().mockResolvedValue({ id: 'te-1' }),
      },
      outboxEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      employee: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'emp-1',
          hourlyRate: 75,
        }),
      },
      ...store,
      $transaction: jest.fn(async (cb: (tx: typeof store) => Promise<unknown>) => cb(store)),
    };

    const handler = new RecordTimeEntryHandler(prisma as never);
    const result = await handler.execute(
      new RecordTimeEntryCommand('emp-1', 'proj-1', 8, 'WO-1', 'default'),
    );

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(store.timeEntry.create).toHaveBeenCalled();
    expect(store.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'hr.time.entry.recorded.v1',
          payload: expect.objectContaining({
            hours: 8,
            hourlyRatePln: 75,
            projectId: 'proj-1',
          }),
        }),
      }),
    );
    expect(result).toEqual({ success: true, timeEntryId: 'te-1' });
  });
});
