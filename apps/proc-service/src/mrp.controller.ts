import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { MrpNettingService } from './mrp-netting.service';
import { MrpAggregateService } from './mrp-aggregate.service';
import { CreatePurchaseOrderCommand } from './commands/create-purchase-order.handler';
import { PrismaService } from './prisma.service';

@Controller('mrp')
export class MrpController {
  constructor(
    private readonly mrp: MrpNettingService,
    private readonly aggregate: MrpAggregateService,
    private readonly commandBus: CommandBus,
    private readonly prisma: PrismaService,
  ) {}

  /** MRP II netting: zapotrzebowanie brutto − stany − zamówienia otwarte */
  @Get('netting')
  async getNetting(@Query('projectId') projectId?: string) {
    return this.mrp.computeNetting(projectId || undefined);
  }

  /** W56 — MRP aggregate summary (SAP-deep procurement) */
  @Get('aggregate')
  async getAggregate(@Query('projectId') projectId?: string) {
    return this.aggregate.aggregate(projectId || undefined);
  }

  /** Uruchom MRP — generuj szkice PO dla pozycji z netRequirement > 0 */
  @Post('run')
  async runMrp(
    @Body() body: { projectId?: string; createOrders?: boolean; skus?: string[] } = {},
  ) {
    const { lines } = await this.mrp.computeNetting(body.projectId);
    const targets = body.skus?.length
      ? lines.filter((l) => body.skus!.includes(l.sku) && l.netRequirement > 0)
      : lines.filter((l) => l.netRequirement > 0);

    const created: { sku: string; amount: number; poId?: string }[] = [];

    if (body.createOrders !== false) {
      for (const line of targets) {
        const supplier = line.supplierCode
          ? await this.prisma.supplier.findFirst({ where: { code: line.supplierCode } })
          : await this.prisma.supplier.findFirst({ where: { isActive: true }, orderBy: { leadTimeDays: 'asc' } });

        const po = await this.commandBus.execute(
          new CreatePurchaseOrderCommand(line.sku, Math.ceil(line.netRequirement), {
            projectId: body.projectId,
            supplierId: supplier?.id,
            source: 'MRP',
            tenantId: 'default',
          }),
        );
        created.push({ sku: line.sku, amount: Math.ceil(line.netRequirement), poId: po?.id });
      }
    }

    return {
      runAt: new Date().toISOString(),
      analyzed: lines.length,
      netPositive: targets.length,
      created,
      lines: targets,
    };
  }
}
