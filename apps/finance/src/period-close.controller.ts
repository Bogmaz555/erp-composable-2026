import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ETO_MUTATION_ROLES } from '@erp/shared-kernel';
import { PeriodCloseService, currentPeriodKey } from './period-close.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';

/**
 * Admin API for accounting period open/close (Enterprise Q2 PR1).
 * Close is explicit + actor-audited.
 */
@Controller('fin/periods')
export class PeriodCloseController {
  constructor(private readonly periods: PeriodCloseService) {}

  @Get()
  async list(@Query('tenantId') tenantId?: string) {
    const tid = tenantId || 'default';
    const rows = await this.periods.list(tid);
    return { tenantId: tid, periods: rows };
  }

  @Get('current')
  async current(@Query('tenantId') tenantId?: string) {
    const tid = tenantId || 'default';
    return this.periods.ensureOpenPeriod(tid);
  }

  @Get(':periodKey')
  async getOne(
    @Param('periodKey') periodKey: string,
    @Query('tenantId') tenantId?: string,
  ) {
    const tid = tenantId || 'default';
    // Support both YYYY-MM and year/month path segments via single key
    if (periodKey.includes('-')) {
      const period = await this.periods.getPeriod(tid, periodKey);
      if (!period) {
        const [y, m] = periodKey.split('-').map((x) => parseInt(x, 10));
        return this.periods.ensureOpenPeriod(tid, new Date(Date.UTC(y, m - 1, 1)));
      }
      return period;
    }
    return this.periods.ensureOpenPeriod(tid);
  }

  @Post(':periodKey/begin-close')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ETO_MUTATION_ROLES.FIN_WIP_WRITE)
  async beginClose(
    @Param('periodKey') periodKey: string,
    @Body() body: { tenantId?: string; actor?: string },
  ) {
    const key = periodKey === 'current' ? currentPeriodKey() : periodKey;
    return this.periods.beginCloseKey(
      body.tenantId || 'default',
      key,
      body.actor || 'admin',
    );
  }

  /** Explicit close command — refuses further postings. */
  @Post(':periodKey/close')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ETO_MUTATION_ROLES.FIN_WIP_WRITE)
  async close(
    @Param('periodKey') periodKey: string,
    @Body() body: { tenantId?: string; actor?: string; notes?: string },
  ) {
    const key = periodKey === 'current' ? currentPeriodKey() : periodKey;
    return this.periods.close(
      body.tenantId || 'default',
      key,
      body.actor || 'admin',
      body.notes,
    );
  }

  @Post(':periodKey/reopen')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ETO_MUTATION_ROLES.FIN_WIP_WRITE)
  async reopen(
    @Param('periodKey') periodKey: string,
    @Body() body: { tenantId?: string; actor?: string },
  ) {
    const key = periodKey === 'current' ? currentPeriodKey() : periodKey;
    return this.periods.reopen(
      body.tenantId || 'default',
      key,
      body.actor || 'admin',
    );
  }
}
