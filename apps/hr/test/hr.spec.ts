import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule, EventPublisher } from '@nestjs/cqrs';
import { CreateHrHandler, CreateHrCommand, HrCreatedEvent } from '../src/hr.handler';

describe('Domain Logic CQRS: Hr', () => {
  let handler: CreateHrHandler;
  let publisher: EventPublisher;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [CreateHrHandler],
    }).compile();

    handler = moduleRef.get(CreateHrHandler);
    publisher = moduleRef.get(EventPublisher);
  });

  it('should process CreateHrCommand and emit HrCreatedEvent with valid payload', async () => {
    const command = new CreateHrCommand('id-123', { amount: 500, status: 'DRAFT' });
    const result = await handler.execute(command);
    
    expect(result).toBeInstanceOf(HrCreatedEvent);
    expect(result.id).toEqual('id-123');
    expect(result.payload.amount).toEqual(500);
  });

  it('should throw Error if payload is missing (Domain Rule)', async () => {
    const command = new CreateHrCommand('id-error', null);
    await expect(handler.execute(command)).rejects.toThrow('Invalid Payload for Hr');
  });
});
