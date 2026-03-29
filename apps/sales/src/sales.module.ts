import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateSalesHandler } from './sales.handler';

@Module({
  imports: [CqrsModule],
  providers: [CreateSalesHandler],
})
export class SalesModule {}
