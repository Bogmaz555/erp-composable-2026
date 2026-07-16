import { Injectable } from '@nestjs/common';
import { PrismaClient } from '.prisma/client-eam';
import { MaintenanceAggregateService } from './maintenance-aggregate.service';

/** W137 — EAM production status (maintenance + IoT combined) */
@Injectable()
export class EamProductionService {
  private readonly prisma = new PrismaClient();

  constructor(private readonly maintenance: MaintenanceAggregateService) {}

  async status() {
    const maint = await this.maintenance.aggregate();
    const [broken, recentBreakdowns] = await Promise.all([
      this.prisma.equipment.count({ where: { status: 'BROKEN' } }),
      this.prisma.breakdownEvent.count({
        where: { detectedAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      }),
    ]);

    const productionReady =
      maint.availabilityPct >= 85 && broken === 0 && maint.overdueTasks <= 5;

    return {
      source: 'eam-production',
      equipmentCount: maint.equipmentCount,
      availabilityPct: maint.availabilityPct,
      overdueTasks: maint.overdueTasks,
      brokenEquipment: broken,
      breakdownsLast7d: recentBreakdowns,
      productionReady,
      equipmentByStatus: maint.equipmentByStatus,
      checkedAt: new Date().toISOString(),
    };
  }
}
