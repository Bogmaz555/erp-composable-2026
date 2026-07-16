import { Controller, Get } from '@nestjs/common';
import { AlertOncallReadinessService } from './alert-oncall-readiness.service';

@Controller()
export class AlertOncallReadinessController {
  constructor(private readonly alertOncall: AlertOncallReadinessService) {}

  @Get('platform/alert-oncall/readiness')
  readiness() {
    return this.alertOncall.getReadiness();
  }
}
