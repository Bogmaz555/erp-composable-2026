import { Controller, Get } from '@nestjs/common';
import { BiSchedulerReadinessService } from './bi-scheduler-readiness.service';

@Controller()
export class BiSchedulerReadinessController {
  constructor(private readonly biScheduler: BiSchedulerReadinessService) {}

  @Get('platform/bi-scheduler/readiness')
  readiness() {
    return this.biScheduler.getReadiness();
  }
}
