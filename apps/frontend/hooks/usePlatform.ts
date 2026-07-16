import { useQuery } from '@tanstack/react-query';

export interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  link: string;
}

export function useGlobalSearch(q: string) {
  return useQuery<{ results: SearchResult[]; count: number }>({
    queryKey: ['platform-search', q],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
    enabled: q.length >= 2,
    staleTime: 10000,
  });
}

export function useKpiDashboard() {
  return useQuery({
    queryKey: ['platform-kpi'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/kpi');
      if (!res.ok) throw new Error('KPI failed');
      return res.json();
    },
    refetchInterval: 15000,
  });
}

export function useAuditLog(opts?: { complianceOnly?: boolean; category?: string }) {
  const complianceOnly = opts?.complianceOnly ?? false;
  const category = opts?.category ?? '';
  return useQuery({
    queryKey: ['platform-audit', complianceOnly, category],
    queryFn: async () => {
      const params = new URLSearchParams({ take: '50' });
      if (complianceOnly) params.set('complianceOnly', 'true');
      if (category) params.set('category', category);
      const res = await fetch(`/api/analytics/audit?${params}`);
      if (!res.ok) throw new Error('Audit failed');
      return res.json();
    },
    refetchInterval: 10000,
  });
}

export function useAuditReadiness() {
  return useQuery({
    queryKey: ['platform-audit-readiness'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/platform/audit/readiness');
      if (!res.ok) throw new Error('Audit readiness failed');
      return res.json();
    },
    refetchInterval: 30000,
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ['platform-notifications'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/notifications');
      if (!res.ok) throw new Error('Notifications failed');
      return res.json();
    },
    refetchInterval: 8000,
  });
}
