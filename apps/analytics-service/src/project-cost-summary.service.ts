import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectCostSummaryService {
  private readonly pmBase = 'http://127.0.0.1:4002';
  private readonly finBase = 'http://127.0.0.1:4010';

  private async probe<T>(url: string): Promise<T | null> {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      return res.ok ? ((await res.json()) as T) : null;
    } catch {
      return null;
    }
  }

  async getSummary(projectId: string) {
    const [wipBreakdown, budgetVariance, projects] = await Promise.all([
      this.probe<Record<string, unknown>>(`${this.finBase}/fin/projects/${projectId}/wip-breakdown`),
      this.probe<{ rows?: Array<Record<string, unknown>> }>(`${this.finBase}/fin/budget-variance`),
      this.probe<Array<Record<string, unknown>>>(`${this.pmBase}/`),
    ]);

    const projectList = Array.isArray(projects) ? projects : [];
    const pmProject = projectList.find((p) => p.id === projectId);
    const budgetRow = budgetVariance?.rows?.find((r) => r.projectId === projectId);

    const breakdown = (wipBreakdown?.breakdown ?? {}) as Record<string, { amount?: number }>;
    const materialCost = breakdown.MATERIAL?.amount ?? 0;
    const laborCost = breakdown.LABOR?.amount ?? 0;
    const overheadCost = breakdown.OVERHEAD?.amount ?? 0;
    const subcontractCost = breakdown.SUBCONTRACT?.amount ?? 0;
    const actualFromBreakdown = materialCost + laborCost + overheadCost + subcontractCost;

    const totals = wipBreakdown?.totals as Record<string, number> | undefined;
    const actualCost = Number(totals?.combinedActual ?? budgetRow?.actualCost ?? actualFromBreakdown);
    const plannedCost = Number(pmProject?.budget ?? pmProject?.totalBudget ?? budgetRow?.budget ?? 0);
    const projectRevenue = Number(pmProject?.contractValue ?? pmProject?.revenue ?? 0);

    const costVariance = plannedCost > 0 ? plannedCost - actualCost : 0;
    const marginPercentage =
      projectRevenue > 0 ? ((projectRevenue - actualCost) / projectRevenue) * 100 : 0;
    const progressPercent = Number(budgetRow?.percentUsed ?? 0);

    return {
      found: !!wipBreakdown?.found || !!pmProject || !!budgetRow,
      source: 'live',
      projectId,
      projectName: pmProject?.name ?? budgetRow?.projectName ?? projectId,
      plannedCost: Math.round(plannedCost),
      actualCost: Math.round(Number(actualCost)),
      projectRevenue: Math.round(projectRevenue),
      breakdown: {
        materials: Math.round(materialCost),
        labor: Math.round(laborCost + (totals?.laborFromWip ?? 0)),
        overhead: Math.round(overheadCost),
        subcontractors: Math.round(subcontractCost),
      },
      costVariance: Math.round(costVariance),
      marginPercentage: marginPercentage.toFixed(2),
      progressPercent,
      checkedAt: new Date().toISOString(),
    };
  }
}
