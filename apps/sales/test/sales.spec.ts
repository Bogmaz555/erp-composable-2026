import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule, EventPublisher } from '@nestjs/cqrs';
import { CreateSalesHandler, CreateSalesCommand, SalesCreatedEvent } from '../src/sales.handler';

describe('Domain Logic CQRS: Sales', () => {
  let handler: CreateSalesHandler;
  let publisher: EventPublisher;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [CreateSalesHandler],
    }).compile();

    handler = moduleRef.get(CreateSalesHandler);
    publisher = moduleRef.get(EventPublisher);
  });

  it('should process CreateSalesCommand and emit SalesCreatedEvent with valid payload', async () => {
    const command = new CreateSalesCommand('id-123', { amount: 500, status: 'DRAFT' });
    const result = await handler.execute(command);
    
    expect(result).toBeInstanceOf(SalesCreatedEvent);
    expect(result.id).toEqual('id-123');
    expect(result.payload.amount).toEqual(500);
  });

  it('should throw Error if payload is missing (Domain Rule)', async () => {
    const command = new CreateSalesCommand('id-error', null);
    await expect(handler.execute(command)).rejects.toThrow('Invalid Payload for Sales');
  });
});
