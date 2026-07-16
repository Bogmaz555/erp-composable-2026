import { Controller, Get } from '@nestjs/common';
import { AlertEscalationReadinessService } from './alert-escalation-readiness.service';

@Controller()
export class AlertEscalationReadinessController {
  constructor(private readonly alertEscalation: AlertEscalationReadinessService) {}

  @Get('platform/alert-escalation/readiness')
  readiness() {
    return this.alertEscalation.getReadiness();
  }
}
