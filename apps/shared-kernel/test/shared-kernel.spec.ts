import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule, EventPublisher } from '@nestjs/cqrs';
import { CreateSharedKernelHandler, CreateSharedKernelCommand, SharedKernelCreatedEvent } from '../src/shared-kernel.handler';

describe('Domain Logic CQRS: SharedKernel', () => {
  let handler: CreateSharedKernelHandler;
  let publisher: EventPublisher;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [CreateSharedKernelHandler],
    }).compile();

    handler = moduleRef.get(CreateSharedKernelHandler);
    publisher = moduleRef.get(EventPublisher);
  });

  it('should process CreateSharedKernelCommand and emit SharedKernelCreatedEvent with valid payload', async () => {
    const command = new CreateSharedKernelCommand('id-123', { amount: 500, status: 'DRAFT' });
    const result = await handler.execute(command);
    
    expect(result).toBeInstanceOf(SharedKernelCreatedEvent);
    expect(result.id).toEqual('id-123');
    expect(result.payload.amount).toEqual(500);
  });

  it('should throw Error if payload is missing (Domain Rule)', async () => {
    const command = new CreateSharedKernelCommand('id-error', null);
    await expect(handler.execute(command)).rejects.toThrow('Invalid Payload for SharedKernel');
  });
});
