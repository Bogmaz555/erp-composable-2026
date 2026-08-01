import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateReservationHandler } from '../src/commands/create-reservation.handler';
import { CreateReservationCommand } from '../src/commands/create-reservation.command';
import { PrismaService } from '../src/prisma.service';

function mockPrismaTx(store: Record<string, unknown>) {
  return {
    ...store,
    $transaction: jest.fn(async (cb: (tx: typeof store) => Promise<unknown>) => cb(store)),
  };
}

// Focused on ETO + TD-001: Reservation creation should carry bomComponentId and be auditable
describe('INV: CreateReservation with bomComponentId and audit', () => {
  let handler: CreateReservationHandler;
  let prisma: PrismaService;

  beforeEach(async () => {
    const store = {
      reservation: { create: jest.fn().mockResolvedValue({ id: 'res-audit', createdAt: new Date() }) },
      stockTransaction: { create: jest.fn() },
      stockLevel: { findFirst: jest.fn().mockResolvedValue({ id: 'sl-1', quantity: 20 }), update: jest.fn() },
      outboxEvent: { create: jest.fn() },
    };
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        CreateReservationHandler,
        {
          provide: PrismaService,
          useValue: mockPrismaTx(store),
        },
      ],
    }).compile();

    handler = moduleRef.get(CreateReservationHandler);
    prisma = moduleRef.get(PrismaService);
  });

  it('should create reservation with bomComponentId and emit created event', async () => {
    const cmd = new CreateReservationCommand(
      'item-xyz',
      2,
      'proj-777',
      null,
      null,
      'bom-comp-xyz-42',
      'tenant-a',
      'user-from-gateway'
    );

    const result = await handler.execute(cmd);

    expect(result).toBeDefined();
    expect((prisma as any).$transaction).toHaveBeenCalled();
    expect((prisma as any).reservation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ bomComponentId: 'bom-comp-xyz-42' }),
      })
    );
    expect((prisma as any).outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'inventory.reservation.created.v1' }),
      })
    );
  });
});
