import { useQuery } from '@tanstack/react-query';

export interface BiDashboardData {
  projectId: string;
  source: string;
  cost?: {
    plannedCost?: number;
    actualCost?: number;
    marginPercentage?: string;
    progressPercent?: number;
    breakdown?: {
      materials?: number;
      labor?: number;
      overhead?: number;
      subcontractors?: number;
    };
  };
  manufacturing?: {
    workOrderCount?: number;
    activeWorkOrders?: number;
  };
  quality?: {
    ncrCount?: number;
    openNcr?: number;
  };
  schedule?: {
    phaseCount?: number;
  } | null;
  checkedAt?: string;
}

export function useBiDashboard(projectId: string | null) {
  return useQuery<BiDashboardData>({
    queryKey: ['bi-dashboard', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/bi/projects/${projectId}/dashboard`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`BI dashboard HTTP ${res.status}`);
      const data = await res.json();
      if (data.source !== 'read-model') throw new Error('Expected read-model source');
      return data;
    },
    enabled: !!projectId,
    refetchInterval: 30000,
  });
}
