import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateReservationHandler } from '../src/commands/create-reservation.handler';
import { CreateReservationCommand } from '../src/commands/create-reservation.command';
import { PrismaService } from '../src/prisma.service';

// Focused on ETO traceability: Reservation must carry bomComponentId
describe('INV: CreateReservation bomComponentId traceability', () => {
  let handler: CreateReservationHandler;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        CreateReservationHandler,
        {
          provide: PrismaService,
          useValue: {
            reservation: { create: jest.fn().mockResolvedValue({ id: 'res-1' }) },
            stockTransaction: { create: jest.fn() },
            stockLevel: { findFirst: jest.fn().mockResolvedValue({ id: 'sl-1', quantity: 50 }), update: jest.fn() },
            outboxEvent: { create: jest.fn() },
          },
        },
      ],
    }).compile();

    handler = moduleRef.get(CreateReservationHandler);
    prisma = moduleRef.get(PrismaService);
  });

  it('should persist bomComponentId on reservation and transaction', async () => {
    const cmd = new CreateReservationCommand('item-1', 3, 'proj-1', null, null, 'bom-comp-xyz', 't1', 'user-1');

    await handler.execute(cmd);

    expect((prisma as any).reservation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ bomComponentId: 'bom-comp-xyz' }),
      })
    );
  });

  it('should emit inventory.reservation.created.v1 with bomComponentId + createdBy for full ETO spine (ties to PLM release + Finance WIP)', async () => {
    const cmd = new CreateReservationCommand(
      'item-bom-trace',
      7,
      'proj-eto-77',
      'wo-123',
      null,
      'bom-comp-uuid-xyz',
      'tenant-1',
      'user-auth-42'  // comes from authenticated caller / NATS x-user-id in real flow
    );

    await handler.execute(cmd);

    expect((prisma as any).outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'inventory.reservation.created.v1',
        payload: expect.objectContaining({
          bomComponentId: 'bom-comp-uuid-xyz',
          workOrderId: 'wo-123',
          projectId: 'proj-eto-77',
          createdBy: 'user-auth-42',
          quantity: 7,
        }),
      })
    );

    // In the PLM→INV auto-flow (pm-integration.controller), the listener now extracts x-user-id
    // from NATS headers and passes it as the last arg (createdBy) to CreateReservationCommand.
    // This keeps the entire bomComponentId traceability chain identity-aware (TD-001).
  });
});
