import { Injectable } from '@nestjs/common';
import { PrismaClient } from '.prisma/client-eam';

@Injectable()
export class MaintenanceAggregateService {
  private readonly prisma = new PrismaClient();

  async aggregate() {
    const [equipment, tasks, breakdowns] = await Promise.all([
      this.prisma.equipment.findMany(),
      this.prisma.maintenanceTask.findMany(),
      this.prisma.breakdownEvent.findMany({
        where: { detectedAt: { gte: new Date(Date.now() - 30 * 86400000) } },
      }),
    ]);

    const equipmentByStatus: Record<string, number> = {};
    for (const e of equipment) {
      equipmentByStatus[e.status] = (equipmentByStatus[e.status] ?? 0) + 1;
    }

    const tasksByType: Record<string, number> = {};
    const tasksByStatus: Record<string, number> = {};
    for (const t of tasks) {
      tasksByType[t.type] = (tasksByType[t.type] ?? 0) + 1;
      tasksByStatus[t.status] = (tasksByStatus[t.status] ?? 0) + 1;
    }

    const overdue = tasks.filter(
      (t) => t.status === 'SCHEDULED' && t.scheduledDate < new Date(),
    ).length;

    return {
      equipmentCount: equipment.length,
      maintenanceTaskCount: tasks.length,
      breakdownsLast30d: breakdowns.length,
      overdueTasks: overdue,
      equipmentByStatus,
      tasksByType,
      tasksByStatus,
      availabilityPct:
        equipment.length > 0
          ? Math.round(
              ((equipment.filter((e) => e.status === 'OPERATIONAL').length / equipment.length) * 100),
            )
          : 100,
      checkedAt: new Date().toISOString(),
    };
  }
}
