import { Controller, Get } from '@nestjs/common';
import { AlertNotifyReadinessService } from './alert-notify-readiness.service';

@Controller()
export class AlertNotifyReadinessController {
  constructor(private readonly alertNotify: AlertNotifyReadinessService) {}

  @Get('platform/alert-notify/readiness')
  readiness() {
    return this.alertNotify.getReadiness();
  }
}
