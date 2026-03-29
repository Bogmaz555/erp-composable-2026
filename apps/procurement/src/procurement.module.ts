import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateProcurementHandler } from './procurement.handler';

@Module({
  imports: [CqrsModule],
  providers: [CreateProcurementHandler],
})
export class ProcurementModule {}
