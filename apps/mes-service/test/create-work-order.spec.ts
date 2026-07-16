import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateWorkOrderHandler, CreateWorkOrderCommand } from '../src/commands/create-work-order.handler';
import { PrismaService } from '../src/prisma.service';

// Test skeleton for CreateWorkOrder with BOM components explosion (Faza 1 ETO)
describe('MES: CreateWorkOrderHandler with bom traceability', () => {
  let handler: CreateWorkOrderHandler;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        CreateWorkOrderHandler,
        {
          provide: PrismaService,
          useValue: {
            workOrder: {
              create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'wo-test', ...data.data })),
            },
            materialRequirement: {
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    handler = moduleRef.get(CreateWorkOrderHandler);
    prisma = moduleRef.get(PrismaService);
  });

  it('should create WorkOrder and explode components into MaterialRequirement when bomVersionId + components provided', async () => {
    const components = [
      { bomComponentId: 'comp-1', childItemId: 'item-gear', quantity: 4 },
      { bomComponentId: 'comp-2', childItemId: 'item-motor', quantity: 1 },
    ];

    const command = new CreateWorkOrderCommand(
      'project-xyz',
      'wbs-1',
      'Custom Machine X',
      1,
      'bom-v2-123',
      'item-machine-x',
      components,
      'tenant-1'
    );

    const result = await handler.execute(command);

    expect(result.id).toBe('wo-test');
    expect((prisma as any).workOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ bomVersionId: 'bom-v2-123' }) })
    );
    // Verify explosion happened
    expect((prisma as any).materialRequirement.create).toHaveBeenCalledTimes(2);
  });
});
