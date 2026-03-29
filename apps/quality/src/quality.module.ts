import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateQualityHandler } from './quality.handler';

@Module({
  imports: [CqrsModule],
  providers: [CreateQualityHandler],
})
export class QualityModule {}
