import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateAnalyticsHandler } from './analytics.handler';

@Module({
  imports: [CqrsModule],
  providers: [CreateAnalyticsHandler],
})
export class AnalyticsModule {}
