import { Controller, Get, Query } from '@nestjs/common';
import { PrismaClient } from '.prisma/client-eam';

@Controller('eam')
export class EamIotController {
  private readonly prisma = new PrismaClient();

  @Get('iot/status')
  async iotStatus() {
    const [broken, total, recentCount] = await Promise.all([
      this.prisma.equipment.count({ where: { status: 'BROKEN' } }),
      this.prisma.equipment.count(),
      this.prisma.breakdownEvent.count({
        where: { detectedAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      }),
    ]);
    return {
      source: 'eam-iot-lite',
      equipmentTotal: total,
      brokenCount: broken,
      breakdownsLast7d: recentCount,
      iotEnabled: true,
    };
  }

  @Get('breakdowns/recent')
  async recentBreakdowns(@Query('take') take = '10') {
    const n = Math.min(parseInt(take, 10) || 10, 50);
    const items = await this.prisma.breakdownEvent.findMany({
      orderBy: { detectedAt: 'desc' },
      take: n,
      include: { equipment: { select: { name: true, serialNumber: true, location: true } } },
    });
    return { count: items.length, items };
  }
}
