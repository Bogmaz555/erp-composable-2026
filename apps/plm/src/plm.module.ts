import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreatePlmHandler } from './plm.handler';

@Module({
  imports: [CqrsModule],
  providers: [CreatePlmHandler],
})
export class PlmModule {}
