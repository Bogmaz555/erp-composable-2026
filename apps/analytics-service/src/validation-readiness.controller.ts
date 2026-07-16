import { Controller, Get } from '@nestjs/common';
import { ValidationReadinessService } from './validation-readiness.service';

@Controller()
export class ValidationReadinessController {
  constructor(private readonly validation: ValidationReadinessService) {}

  @Get('platform/validation/readiness')
  readiness() {
    return this.validation.getReadiness();
  }
}
