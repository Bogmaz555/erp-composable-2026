import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class RoutingAggregateService {
  constructor(private readonly prisma: PrismaService) {}

  async aggregate() {
    const operations = await this.prisma.operation.findMany({
      include: { workOrder: { select: { id: true, orderNumber: true, status: true, projectId: true } } },
      orderBy: [{ workCenter: 'asc' }, { sequence: 'asc' }],
    });

    const centerMap = new Map<
      string,
      {
        workCenter: string;
        operationCount: number;
        pending: number;
        inProgress: number;
        completed: number;
        totalStandardMinutes: number;
        workOrderIds: Set<string>;
      }
    >();

    for (const op of operations) {
      const wc = op.workCenter || 'UNASSIGNED';
      let bucket = centerMap.get(wc);
      if (!bucket) {
        bucket = {
          workCenter: wc,
          operationCount: 0,
          pending: 0,
          inProgress: 0,
          completed: 0,
          totalStandardMinutes: 0,
          workOrderIds: new Set(),
        };
        centerMap.set(wc, bucket);
      }
      bucket.operationCount += 1;
      bucket.totalStandardMinutes += op.standardTimeMinutes ?? 0;
      bucket.workOrderIds.add(op.workOrderId);
      if (op.status === 'COMPLETED') bucket.completed += 1;
      else if (op.status === 'IN_PROGRESS') bucket.inProgress += 1;
      else bucket.pending += 1;
    }

    const workCenters = [...centerMap.values()].map((c) => ({
      workCenter: c.workCenter,
      operationCount: c.operationCount,
      pending: c.pending,
      inProgress: c.inProgress,
      completed: c.completed,
      totalStandardMinutes: Math.round(c.totalStandardMinutes * 100) / 100,
      workOrderCount: c.workOrderIds.size,
      utilizationPct:
        c.operationCount > 0 ? Math.round((c.completed / c.operationCount) * 100) : 0,
    }));

    return {
      workCenterCount: workCenters.length,
      totalOperations: operations.length,
      workCenters,
      checkedAt: new Date().toISOString(),
    };
  }
}
