import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule, EventPublisher } from '@nestjs/cqrs';
import { CreateIotAiHandler, CreateIotAiCommand, IotAiCreatedEvent } from '../src/iot-ai.handler';

describe('Domain Logic CQRS: IotAi', () => {
  let handler: CreateIotAiHandler;
  let publisher: EventPublisher;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [CreateIotAiHandler],
    }).compile();

    handler = moduleRef.get(CreateIotAiHandler);
    publisher = moduleRef.get(EventPublisher);
  });

  it('should process CreateIotAiCommand and emit IotAiCreatedEvent with valid payload', async () => {
    const command = new CreateIotAiCommand('id-123', { amount: 500, status: 'DRAFT' });
    const result = await handler.execute(command);
    
    expect(result).toBeInstanceOf(IotAiCreatedEvent);
    expect(result.id).toEqual('id-123');
    expect(result.payload.amount).toEqual(500);
  });

  it('should throw Error if payload is missing (Domain Rule)', async () => {
    const command = new CreateIotAiCommand('id-error', null);
    await expect(handler.execute(command)).rejects.toThrow('Invalid Payload for IotAi');
  });
});
