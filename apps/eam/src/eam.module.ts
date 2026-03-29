import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateEamHandler } from './eam.handler';

@Module({
  imports: [CqrsModule],
  providers: [CreateEamHandler],
})
export class EamModule {}
