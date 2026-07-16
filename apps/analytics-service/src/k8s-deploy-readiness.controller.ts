import { Controller, Get } from '@nestjs/common';
import { K8sDeployReadinessService } from './k8s-deploy-readiness.service';

@Controller()
export class K8sDeployReadinessController {
  constructor(private readonly k8sDeploy: K8sDeployReadinessService) {}

  @Get('platform/k8s-deploy/readiness')
  readiness() {
    return this.k8sDeploy.getReadiness();
  }
}
