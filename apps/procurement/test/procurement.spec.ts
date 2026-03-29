import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule, EventPublisher } from '@nestjs/cqrs';
import { CreateProcurementHandler, CreateProcurementCommand, ProcurementCreatedEvent } from '../src/procurement.handler';

describe('Domain Logic CQRS: Procurement', () => {
  let handler: CreateProcurementHandler;
  let publisher: EventPublisher;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [CreateProcurementHandler],
    }).compile();

    handler = moduleRef.get(CreateProcurementHandler);
    publisher = moduleRef.get(EventPublisher);
  });

  it('should process CreateProcurementCommand and emit ProcurementCreatedEvent with valid payload', async () => {
    const command = new CreateProcurementCommand('id-123', { amount: 500, status: 'DRAFT' });
    const result = await handler.execute(command);
    
    expect(result).toBeInstanceOf(ProcurementCreatedEvent);
    expect(result.id).toEqual('id-123');
    expect(result.payload.amount).toEqual(500);
  });

  it('should throw Error if payload is missing (Domain Rule)', async () => {
    const command = new CreateProcurementCommand('id-error', null);
    await expect(handler.execute(command)).rejects.toThrow('Invalid Payload for Procurement');
  });
});
