import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule, EventPublisher } from '@nestjs/cqrs';
import { CreateQualityHandler, CreateQualityCommand, QualityCreatedEvent } from '../src/quality.handler';

describe('Domain Logic CQRS: Quality', () => {
  let handler: CreateQualityHandler;
  let publisher: EventPublisher;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [CreateQualityHandler],
    }).compile();

    handler = moduleRef.get(CreateQualityHandler);
    publisher = moduleRef.get(EventPublisher);
  });

  it('should process CreateQualityCommand and emit QualityCreatedEvent with valid payload', async () => {
    const command = new CreateQualityCommand('id-123', { amount: 500, status: 'DRAFT' });
    const result = await handler.execute(command);
    
    expect(result).toBeInstanceOf(QualityCreatedEvent);
    expect(result.id).toEqual('id-123');
    expect(result.payload.amount).toEqual(500);
  });

  it('should throw Error if payload is missing (Domain Rule)', async () => {
    const command = new CreateQualityCommand('id-error', null);
    await expect(handler.execute(command)).rejects.toThrow('Invalid Payload for Quality');
  });
});
