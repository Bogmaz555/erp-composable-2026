import { Injectable } from '@nestjs/common';
import { ProjectCostSummaryService } from './project-cost-summary.service';

@Injectable()
export class BiProjectDashboardService {
  private readonly mesBase = 'http://127.0.0.1:4006';
  private readonly qualityBase = 'http://127.0.0.1:4008';
  private readonly pmBase = 'http://127.0.0.1:4002';

  constructor(private readonly costSummary: ProjectCostSummaryService) {}

  private async probe<T>(url: string): Promise<T | null> {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      return res.ok ? ((await res.json()) as T) : null;
    } catch {
      return null;
    }
  }

  async getDashboard(projectId: string) {
    const [cost, workOrders, ncrs, schedule] = await Promise.all([
      this.costSummary.getSummary(projectId),
      this.probe<Array<Record<string, unknown>>>(`${this.mesBase}/work-orders`),
      this.probe<Array<Record<string, unknown>>>(`${this.qualityBase}/ncrs`),
      this.probe<Record<string, unknown>>(`${this.pmBase}/projects/${projectId}/schedule`),
    ]);

    const woList = (Array.isArray(workOrders) ? workOrders : []).filter(
      (w) => w.projectId === projectId,
    );
    const ncrList = (Array.isArray(ncrs) ? ncrs : []).filter(
      (n) => n.projectId === projectId || !n.projectId,
    );
    const openNcr = ncrList.filter((n) => n.status !== 'CLOSED').length;

    return {
      projectId,
      source: 'read-model',
      cost,
      manufacturing: {
        workOrderCount: woList.length,
        activeWorkOrders: woList.filter((w) => w.status !== 'COMPLETED').length,
      },
      quality: {
        ncrCount: ncrList.length,
        openNcr,
      },
      schedule: schedule
        ? {
            phaseCount: Array.isArray((schedule as { phases?: unknown[] }).phases)
              ? (schedule as { phases: unknown[] }).phases.length
              : 0,
          }
        : null,
      checkedAt: new Date().toISOString(),
    };
  }
}
