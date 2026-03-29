import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule, EventPublisher } from '@nestjs/cqrs';
import { CreateInventoryHandler, CreateInventoryCommand, InventoryCreatedEvent } from '../src/inventory.handler';

describe('Domain Logic CQRS: Inventory', () => {
  let handler: CreateInventoryHandler;
  let publisher: EventPublisher;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [CreateInventoryHandler],
    }).compile();

    handler = moduleRef.get(CreateInventoryHandler);
    publisher = moduleRef.get(EventPublisher);
  });

  it('should process CreateInventoryCommand and emit InventoryCreatedEvent with valid payload', async () => {
    const command = new CreateInventoryCommand('id-123', { amount: 500, status: 'DRAFT' });
    const result = await handler.execute(command);
    
    expect(result).toBeInstanceOf(InventoryCreatedEvent);
    expect(result.id).toEqual('id-123');
    expect(result.payload.amount).toEqual(500);
  });

  it('should throw Error if payload is missing (Domain Rule)', async () => {
    const command = new CreateInventoryCommand('id-error', null);
    await expect(handler.execute(command)).rejects.toThrow('Invalid Payload for Inventory');
  });
});
