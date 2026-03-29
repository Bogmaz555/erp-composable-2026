import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule, EventPublisher } from '@nestjs/cqrs';
import { CreatePlmHandler, CreatePlmCommand, PlmCreatedEvent } from '../src/plm.handler';

describe('Domain Logic CQRS: Plm', () => {
  let handler: CreatePlmHandler;
  let publisher: EventPublisher;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [CreatePlmHandler],
    }).compile();

    handler = moduleRef.get(CreatePlmHandler);
    publisher = moduleRef.get(EventPublisher);
  });

  it('should process CreatePlmCommand and emit PlmCreatedEvent with valid payload', async () => {
    const command = new CreatePlmCommand('id-123', { amount: 500, status: 'DRAFT' });
    const result = await handler.execute(command);
    
    expect(result).toBeInstanceOf(PlmCreatedEvent);
    expect(result.id).toEqual('id-123');
    expect(result.payload.amount).toEqual(500);
  });

  it('should throw Error if payload is missing (Domain Rule)', async () => {
    const command = new CreatePlmCommand('id-error', null);
    await expect(handler.execute(command)).rejects.toThrow('Invalid Payload for Plm');
  });
});
