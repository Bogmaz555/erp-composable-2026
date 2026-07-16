import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { GetGenealogyForwardQuery } from './queries/get-genealogy-forward.query';
import { GetGenealogyBackwardQuery } from './queries/get-genealogy-backward.query';
import { GetGenealogyChainQuery } from './queries/get-genealogy-chain.query';
import { PrismaService } from './prisma.service';
import { randomUUID } from 'crypto';

@UseGuards(JwtAuthGuard)
@Controller('inventory/genealogy')
export class GenealogyController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly prisma: PrismaService,
  ) {}

  /** Forward trace: finished machine serial → consumed components/lots */
  @Get('forward/:parentSerialOrLot')
  async forward(
    @Param('parentSerialOrLot') parentSerialOrLot: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.queryBus.execute(new GetGenealogyForwardQuery(parentSerialOrLot, tenantId));
  }

  /** Demo ETO genealogy — maszyna → komponenty (traceability spine seed). */
  @Post('seed-demo')
  async seedDemo(@Query('tenantId') tenantId?: string) {
    const tid = tenantId || 'default';
    const parent = 'SN-MACHINE-ETO-001';
    const existing = await this.prisma.itemGenealogy.count({
      where: { tenantId: tid, parentSerialOrLot: parent },
    });
    if (existing > 0) {
      return { tenantId: tid, parentSerialOrLot: parent, seeded: 0, message: 'already exists' };
    }
    const woId = 'wo-eto-demo-001';
    const rows = [
      { childItemId: 'item-motor-001', childLotId: 'LOT-MOTOR-A1', qty: 1, bom: 'bom-line-motor' },
      { childItemId: 'item-frame-002', childLotId: 'LOT-FRAME-B2', qty: 2, bom: 'bom-line-frame' },
      { childItemId: 'item-panel-003', childLotId: 'LOT-PANEL-C3', qty: 4, bom: 'bom-line-panel' },
    ];
    for (const r of rows) {
      await this.prisma.itemGenealogy.create({
        data: {
          id: randomUUID(),
          tenantId: tid,
          parentSerialOrLot: parent,
          childItemId: r.childItemId,
          childLotId: r.childLotId,
          quantityUsed: r.qty,
          workOrderId: woId,
          bomComponentId: r.bom,
        },
      });
    }
    return { tenantId: tid, parentSerialOrLot: parent, seeded: rows.length, workOrderId: woId };
  }

  /** ETO chain — forward links + summary (W27) */
  @Get('chain/:parentSerialOrLot')
  async chain(
    @Param('parentSerialOrLot') parentSerialOrLot: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.queryBus.execute(new GetGenealogyChainQuery(parentSerialOrLot, tenantId));
  }

  /** Backward trace: lot or BOM line → parent machine / work order */
  @Get('backward')
  async backward(
    @Query('childLotId') childLotId?: string,
    @Query('bomComponentId') bomComponentId?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.queryBus.execute(
      new GetGenealogyBackwardQuery(childLotId, bomComponentId, tenantId),
    );
  }
}
