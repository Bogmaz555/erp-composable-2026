import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ETO_MUTATION_ROLES } from '@erp/shared-kernel';
import { ArApService } from './ar-ap.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';

/** Minimal AR/AP HTTP surface for ETO billing skeleton (Q2 PR2). */
@Controller('fin')
export class ArApController {
  constructor(private readonly arAp: ArApService) {}

  @Get('ar-invoices')
  listAr(@Query('tenantId') tenantId?: string) {
    return this.arAp.listAr(tenantId || 'default');
  }

  @Get('ap-bills')
  listAp(@Query('tenantId') tenantId?: string) {
    return this.arAp.listAp(tenantId || 'default');
  }

  @Post('ar-invoices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ETO_MUTATION_ROLES.FIN_WIP_WRITE)
  createAr(
    @Body()
    body: {
      tenantId?: string;
      projectId?: string;
      client: string;
      amount: number;
      currency?: string;
      milestone?: string;
      ksefReference?: string;
      correlationId?: string;
      postToJournal?: boolean;
    },
  ) {
    return this.arAp.createArInvoice(body);
  }

  @Post('ap-bills')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ETO_MUTATION_ROLES.FIN_WIP_WRITE)
  createAp(
    @Body()
    body: {
      tenantId?: string;
      vendor: string;
      amount: number;
      currency?: string;
      orderRef?: string;
      correlationId?: string;
      postToJournal?: boolean;
    },
  ) {
    return this.arAp.createApBill(body);
  }
}
