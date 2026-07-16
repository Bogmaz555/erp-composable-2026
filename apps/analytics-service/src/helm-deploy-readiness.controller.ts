import { Controller, Get } from '@nestjs/common';
import { HelmDeployReadinessService } from './helm-deploy-readiness.service';

@Controller()
export class HelmDeployReadinessController {
  constructor(private readonly helm: HelmDeployReadinessService) {}

  @Get('platform/helm-deploy/readiness')
  readiness() {
    return this.helm.getReadiness();
  }
}
