import { Controller, Get } from '@nestjs/common';
import { CiAuthRegressionReadinessService } from './ci-auth-regression-readiness.service';

@Controller()
export class CiAuthRegressionReadinessController {
  constructor(private readonly ciAuthRegression: CiAuthRegressionReadinessService) {}

  @Get('platform/ci-auth-regression/readiness')
  readiness() {
    return this.ciAuthRegression.getReadiness();
  }
}
