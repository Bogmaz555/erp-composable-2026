import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateManufacturingHandler } from './manufacturing.handler';

@Module({
  imports: [CqrsModule],
  providers: [CreateManufacturingHandler],
})
export class ManufacturingModule {}
