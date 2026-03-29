import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateHrHandler } from './hr.handler';

@Module({
  imports: [CqrsModule],
  providers: [CreateHrHandler],
})
export class HrModule {}
