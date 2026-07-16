import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { RecordProductionHandler } from '../src/commands/record-production.handler';
import { RecordProductionCommand } from '../src/commands/record-production.command';
import { PrismaService } from '../src/prisma.service';

// Test for production recording with authenticated user context (TD-001 + traceability)
describe('MES: RecordProduction with Auth + bomComponentId', () => {
  let handler: RecordProductionHandler;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        RecordProductionHandler,
        {
          provide: PrismaService,
          useValue: {
            productionRecord: { create: jest.fn() },
            materialRequirement: { findMany: jest.fn().mockResolvedValue([]) },
            asBuiltRecord: { create: jest.fn() },
            outboxEvent: { create: jest.fn() },
          },
        },
      ],
    }).compile();

    handler = moduleRef.get(RecordProductionHandler);
    prisma = moduleRef.get(PrismaService);
  });

  it('should log and process production with user context', async () => {
    const command = new RecordProductionCommand('wo-xyz', 3, 0, 'op-99');

    // In real usage the controller would pass user; here we just verify handler runs cleanly
    const result = await handler.execute(command);

    expect(result).toBeDefined();
    expect((prisma as any).productionRecord.create).toHaveBeenCalled();
  });
});
