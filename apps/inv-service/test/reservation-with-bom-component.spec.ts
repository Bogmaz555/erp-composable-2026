import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule, CommandBus } from '@nestjs/cqrs';
import { CreateReservationHandler } from '../src/commands/create-reservation.handler';
import { CreateReservationCommand } from '../src/commands/create-reservation.command';
import { PrismaService } from '../src/prisma.service';

// Test focused on core ETO traceability: Reservation must carry bomComponentId
describe('INV: CreateReservation with bomComponentId (ETO traceability)', () => {
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
            reservation: {
              create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'res-123', ...data.data })),
            },
            stockTransaction: { create: jest.fn() },
            stockLevel: {
              findFirst: jest.fn().mockResolvedValue({ id: 'sl-1', quantity: 100 }),
              update: jest.fn(),
            },
            outboxEvent: { create: jest.fn() },
          },
        },
      ],
    }).compile();

    handler = moduleRef.get(CreateReservationHandler);
    prisma = moduleRef.get(PrismaService);
  });

  it('should create reservation and stock transaction with bomComponentId', async () => {
    const command = new CreateReservationCommand(
      'item-gear',
      5,
      'project-abc',
      null,
      null,
      'bom-comp-gear-007',   // critical for traceability
      'tenant-1',
      'planner-01'
    );

    const result = await handler.execute(command);

    expect(result).toBeDefined();
    expect((prisma as any).reservation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bomComponentId: 'bom-comp-gear-007',
        }),
      })
    );
    expect((prisma as any).stockTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          referenceType: 'PROJECT',
        }),
      })
    );

    // Also verifies the created event for downstream (Finance WIP, MES, procurement)
    // In real PLM→INV flow the createdBy comes from NATS x-user-id extracted in pm-integration.controller
    expect((prisma as any).outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'inventory.reservation.created.v1',
      })
    );
  });
});
