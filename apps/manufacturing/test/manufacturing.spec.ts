import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule, EventPublisher } from '@nestjs/cqrs';
import { CreateManufacturingHandler, CreateManufacturingCommand, ManufacturingCreatedEvent } from '../src/manufacturing.handler';

describe('Domain Logic CQRS: Manufacturing', () => {
  let handler: CreateManufacturingHandler;
  let publisher: EventPublisher;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [CreateManufacturingHandler],
    }).compile();

    handler = moduleRef.get(CreateManufacturingHandler);
    publisher = moduleRef.get(EventPublisher);
  });

  it('should process CreateManufacturingCommand and emit ManufacturingCreatedEvent with valid payload', async () => {
    const command = new CreateManufacturingCommand('id-123', { amount: 500, status: 'DRAFT' });
    const result = await handler.execute(command);
    
    expect(result).toBeInstanceOf(ManufacturingCreatedEvent);
    expect(result.id).toEqual('id-123');
    expect(result.payload.amount).toEqual(500);
  });

  it('should throw Error if payload is missing (Domain Rule)', async () => {
    const command = new CreateManufacturingCommand('id-error', null);
    await expect(handler.execute(command)).rejects.toThrow('Invalid Payload for Manufacturing');
  });
});
