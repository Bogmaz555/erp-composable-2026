import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule, EventPublisher } from '@nestjs/cqrs';
import { CreateEamHandler, CreateEamCommand, EamCreatedEvent } from '../src/eam.handler';

describe('Domain Logic CQRS: Eam', () => {
  let handler: CreateEamHandler;
  let publisher: EventPublisher;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [CreateEamHandler],
    }).compile();

    handler = moduleRef.get(CreateEamHandler);
    publisher = moduleRef.get(EventPublisher);
  });

  it('should process CreateEamCommand and emit EamCreatedEvent with valid payload', async () => {
    const command = new CreateEamCommand('id-123', { amount: 500, status: 'DRAFT' });
    const result = await handler.execute(command);
    
    expect(result).toBeInstanceOf(EamCreatedEvent);
    expect(result.id).toEqual('id-123');
    expect(result.payload.amount).toEqual(500);
  });

  it('should throw Error if payload is missing (Domain Rule)', async () => {
    const command = new CreateEamCommand('id-error', null);
    await expect(handler.execute(command)).rejects.toThrow('Invalid Payload for Eam');
  });
});
