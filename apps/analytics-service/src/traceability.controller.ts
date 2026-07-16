import { Controller, Get, Post, Query, Headers } from '@nestjs/common';
import { TraceabilityService } from './traceability.service';

@Controller()
export class TraceabilityController {
  constructor(private readonly trace: TraceabilityService) {}

  @Get('traceability/spine')
  async spine(
    @Query('serialOrLot') serialOrLot?: string,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    const tenantId = tenantHeader && tenantHeader !== 'public' ? tenantHeader : 'default';
    const serial = serialOrLot || 'SN-MACHINE-ETO-001';
    return this.trace.getSpine(serial, tenantId);
  }

  @Get('traceability/e2e/readiness')
  async e2eReadiness(@Headers('x-tenant-id') tenantHeader?: string) {
    const tenantId = tenantHeader && tenantHeader !== 'public' ? tenantHeader : 'default';
    return this.trace.getE2eReadiness(tenantId);
  }

  @Get('traceability/e2e/view')
  async e2eView(
    @Query('serialOrLot') serialOrLot?: string,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    const tenantId = tenantHeader && tenantHeader !== 'public' ? tenantHeader : 'default';
    const serial = serialOrLot || 'SN-MACHINE-ETO-001';
    return this.trace.getE2eView(serial, tenantId);
  }

  @Post('traceability/seed-demo')
  async seedDemo(@Headers('x-tenant-id') tenantHeader?: string) {
    const tenantId = tenantHeader && tenantHeader !== 'public' ? tenantHeader : 'default';
    const gw = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
    try {
      const res = await fetch(`${gw}/api/inv/inventory/genealogy/seed-demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': tenantId },
        signal: AbortSignal.timeout(10000),
      });
      const data = res.ok ? await res.json() : { error: res.status };
      return { tenantId, inv: data, spine: await this.trace.getSpine('SN-MACHINE-ETO-001', tenantId) };
    } catch (e) {
      return { tenantId, error: (e as Error).message };
    }
  }
}
