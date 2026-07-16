import { Controller, Get, Post, Param } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantIsolationService } from './tenant-isolation.service';

@Controller()
export class TenantController {
  private readonly tenants = new TenantService();

  constructor(private readonly isolation: TenantIsolationService) {}

  @Get('tenants')
  list() {
    return this.tenants.list();
  }

  @Get('tenants/:id')
  get(@Param('id') id: string) {
    return this.tenants.get(id);
  }

  @Get('tenants/:id/isolation')
  isolationSnapshot(@Param('id') id: string) {
    return this.isolation.getSnapshot(id);
  }

  @Post('tenants/:id/provision')
  provision(@Param('id') id: string) {
    return this.isolation.provisionDemo(id);
  }

  @Get('tenants/hardening/check')
  hardeningCheck() {
    return this.isolation.getHardeningCheck();
  }
}
