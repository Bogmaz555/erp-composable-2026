import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule, EventPublisher } from '@nestjs/cqrs';
import { CreateAnalyticsHandler, CreateAnalyticsCommand, AnalyticsCreatedEvent } from '../src/analytics.handler';

describe('Domain Logic CQRS: Analytics', () => {
  let handler: CreateAnalyticsHandler;
  let publisher: EventPublisher;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [CreateAnalyticsHandler],
    }).compile();

    handler = moduleRef.get(CreateAnalyticsHandler);
    publisher = moduleRef.get(EventPublisher);
  });

  it('should process CreateAnalyticsCommand and emit AnalyticsCreatedEvent with valid payload', async () => {
    const command = new CreateAnalyticsCommand('id-123', { amount: 500, status: 'DRAFT' });
    const result = await handler.execute(command);
    
    expect(result).toBeInstanceOf(AnalyticsCreatedEvent);
    expect(result.id).toEqual('id-123');
    expect(result.payload.amount).toEqual(500);
  });

  it('should throw Error if payload is missing (Domain Rule)', async () => {
    const command = new CreateAnalyticsCommand('id-error', null);
    await expect(handler.execute(command)).rejects.toThrow('Invalid Payload for Analytics');
  });
});
