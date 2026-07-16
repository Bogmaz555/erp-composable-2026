import { Controller, Get } from '@nestjs/common';
import { TenantHardeningReadinessService } from './tenant-hardening-readiness.service';

@Controller()
export class TenantHardeningReadinessController {
  constructor(private readonly tenantHardening: TenantHardeningReadinessService) {}

  @Get('platform/tenant-hardening/readiness')
  readiness() {
    return this.tenantHardening.getReadiness();
  }
}
