import { Controller, Get } from '@nestjs/common';
import { K8sExtendedReadinessService } from './k8s-extended-readiness.service';

@Controller()
export class K8sExtendedReadinessController {
  constructor(private readonly k8sExtended: K8sExtendedReadinessService) {}

  @Get('platform/k8s-extended/readiness')
  readiness() {
    return this.k8sExtended.getReadiness();
  }
}
