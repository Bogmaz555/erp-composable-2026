'use server';

const GW = process.env.GATEWAY_URL || process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://127.0.0.1:4005';

export async function getProjectAnalytics(projectId: string) {
  try {
    const res = await fetch(`${GW}/api/analytics/projects/${projectId}/cost-summary`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return { success: false, error: `Analytics HTTP ${res.status}` };
    }
    const data = await res.json();
    if (data.source !== 'live') {
      return { success: false, error: 'Expected live cost-summary source' };
    }
    return {
      success: true,
      data: {
        projectId: data.projectId,
        plannedCost: data.plannedCost,
        actualCost: data.actualCost,
        breakdown: data.breakdown,
        costVariance: data.costVariance,
        currentMargin: data.projectRevenue - data.actualCost,
        marginPercentage: data.marginPercentage,
        progressPercent: data.progressPercent,
        revenueToComplete: Math.max(0, data.projectRevenue - data.actualCost),
      },
    };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

/** W71 — live BI read model from analytics gateway */
export async function getProjectBiDashboard(projectId: string) {
  try {
    const res = await fetch(`${GW}/api/analytics/bi/projects/${projectId}/dashboard`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      return { success: false, error: `BI dashboard HTTP ${res.status}` };
    }
    const data = await res.json();
    if (data.source !== 'read-model') {
      return { success: false, error: 'Expected read-model BI source' };
    }
    return { success: true, data };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}
