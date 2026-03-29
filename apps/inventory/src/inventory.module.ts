import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateInventoryHandler } from './inventory.handler';

@Module({
  imports: [CqrsModule],
  providers: [CreateInventoryHandler],
})
export class InventoryModule {}
