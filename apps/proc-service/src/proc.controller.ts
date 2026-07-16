import { Controller, Get, Post, Param, Patch, Body, Logger, Req } from '@nestjs/common';
import type { TenantRequest } from './tenant.middleware';
import { PrismaService } from './prisma.service';
import { CommandBus } from '@nestjs/cqrs';
import { ApprovePurchaseOrderCommand } from './commands/approve-purchase-order.handler';
import { ReceiveMaterialCommand } from './commands/receive-material.handler';
import { CreatePurchaseOrderCommand } from './commands/create-purchase-order.handler';
import { UpdatePurchaseOrderEtaCommand } from './commands/update-po-eta.handler';

@Controller('orders')
export class ProcurementController {
  private readonly logger = new Logger(ProcurementController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commandBus: CommandBus
  ) {}

  @Get()
  async getOrders(@Req() req: TenantRequest) {
    const tenantId = req.tenantId || 'default';
    try {
      return await this.prisma.purchaseOrder.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        include: { supplier: true },
      });
    } catch (e) {
      this.logger.warn(`getOrders fallback (tenant=${tenantId}): ${(e as Error).message}`);
      return this.prisma.purchaseOrder.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      });
    }
  }

  @Post('tenant-schema/ensure')
  async ensureTenantSchema(@Req() req: TenantRequest) {
    const tenantId = req.tenantId || 'default';
    const schema = `tenant_${tenantId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    try {
      await this.prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
      return { tenantId, schema, mode: 'schema-ready', status: 'ok' };
    } catch (e) {
      return { tenantId, schema, mode: 'row-level', status: 'fallback', detail: (e as Error).message };
    }
  }

  @Post('seed-demo')
  async seedDemo(@Req() req: TenantRequest) {
    const tenantId = req.tenantId || 'default';
    const existing = await this.prisma.purchaseOrder.count({ where: { tenantId } });
    if (existing > 0) {
      return { tenantId, seeded: 0, message: 'Tenant already has orders' };
    }
    const order = await this.prisma.purchaseOrder.create({
      data: {
        tenantId,
        sku: 'DEMO-SKU-001',
        amount: 10,
        source: 'MANUAL',
        status: 'DRAFT',
        unitPrice: 125.5,
      },
    });
    return { tenantId, seeded: 1, orderId: order.id };
  }

  @Get('landed-cost')
  async landedCostSummary(@Req() req: TenantRequest) {
    const tenantId = req.tenantId || 'default';
    const orders = await this.prisma.purchaseOrder.findMany({
      where: { tenantId, landedUnitCost: { not: null } },
      orderBy: { receivedAt: 'desc' },
      take: 50,
      include: { supplier: true },
    });
    const totalLanded = orders.reduce((s, o) => s + (o.landedUnitCost ?? 0) * (o.receivedQty ?? o.amount), 0);
    return { count: orders.length, totalLandedValue: Math.round(totalLanded * 100) / 100, orders };
  }

  @Post()
  async createOrder(
    @Req() req: TenantRequest,
    @Body() body: {
    sku: string; amount: number; projectId?: string; supplierId?: string; bomComponentId?: string;
    unitPrice?: number; freightCost?: number; customsDuty?: number;
  }) {
    if (!body.sku?.trim() || !body.amount) {
      throw new Error('sku i amount są wymagane');
    }
    return this.commandBus.execute(
      new CreatePurchaseOrderCommand(body.sku.trim(), body.amount, {
        tenantId: req.tenantId || 'default',
        projectId: body.projectId,
        supplierId: body.supplierId,
        bomComponentId: body.bomComponentId,
        source: 'MANUAL',
        unitPrice: body.unitPrice,
        freightCost: body.freightCost,
        customsDuty: body.customsDuty,
      }),
    );
  }

  @Patch(':id/approve')
  async approveOrder(
    @Param('id') id: string,
    @Body('approvedBy') approvedBy: string
  ) {
    return this.commandBus.execute(new ApprovePurchaseOrderCommand(id, approvedBy || 'System', 'APPROVED'));
  }

  @Patch(':id/reject')
  async rejectOrder(
    @Param('id') id: string,
    @Body('approvedBy') approvedBy: string
  ) {
    return this.commandBus.execute(new ApprovePurchaseOrderCommand(id, approvedBy || 'System', 'REJECTED'));
  }

  @Patch(':id/eta')
  async updateEta(
    @Param('id') id: string,
    @Body() body: { expectedDeliveryDate: string; updatedBy?: string }
  ) {
    if (!body.expectedDeliveryDate) throw new Error('expectedDeliveryDate is required');
    return this.commandBus.execute(
      new UpdatePurchaseOrderEtaCommand(id, new Date(body.expectedDeliveryDate), body.updatedBy || 'System')
    );
  }

  @Patch(':id/receive')
  async receiveOrder(
    @Param('id') id: string,
    @Body() body: {
      quantity?: number; receivedBy?: string;
      unitPrice?: number; freightCost?: number; customsDuty?: number;
    },
  ) {
    return this.commandBus.execute(
      new ReceiveMaterialCommand(
        id,
        body.quantity || 0,
        body.receivedBy,
        body.freightCost,
        body.customsDuty,
        body.unitPrice,
      ),
    );
  }
}
