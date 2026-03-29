import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateTaxLegalHandler } from './tax-legal.handler';

@Module({
  imports: [CqrsModule],
  providers: [CreateTaxLegalHandler],
})
export class TaxLegalModule {}
