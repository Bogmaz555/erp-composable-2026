import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule, EventPublisher } from '@nestjs/cqrs';
import { CreateTaxLegalHandler, CreateTaxLegalCommand, TaxLegalCreatedEvent } from '../src/tax-legal.handler';

describe('Domain Logic CQRS: TaxLegal', () => {
  let handler: CreateTaxLegalHandler;
  let publisher: EventPublisher;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [CreateTaxLegalHandler],
    }).compile();

    handler = moduleRef.get(CreateTaxLegalHandler);
    publisher = moduleRef.get(EventPublisher);
  });

  it('should process CreateTaxLegalCommand and emit TaxLegalCreatedEvent with valid payload', async () => {
    const command = new CreateTaxLegalCommand('id-123', { amount: 500, status: 'DRAFT' });
    const result = await handler.execute(command);
    
    expect(result).toBeInstanceOf(TaxLegalCreatedEvent);
    expect(result.id).toEqual('id-123');
    expect(result.payload.amount).toEqual(500);
  });

  it('should throw Error if payload is missing (Domain Rule)', async () => {
    const command = new CreateTaxLegalCommand('id-error', null);
    await expect(handler.execute(command)).rejects.toThrow('Invalid Payload for TaxLegal');
  });
});
