import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface ApprovalRequest {
  id: string;
  module: string;
  entityType: string;
  entityId: string;
  title: string;
  description?: string;
  requestedBy: string;
  requiredRole: string;
  status: string;
  createdAt: string;
}

function tenantHeaders() {
  const tenantId = typeof window !== 'undefined' ? localStorage.getItem('erp-tenant-id') ?? 'default' : 'default';
  return { 'X-Tenant-Id': tenantId };
}

export function useApprovals(status?: string) {
  const q = status ? `?status=${status}` : '';
  return useQuery<{ pending: number; items: ApprovalRequest[] }>({
    queryKey: ['approvals', status],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/approvals${q}`, { headers: tenantHeaders() });
      if (!res.ok) throw new Error('Błąd zatwierdzeń');
      return res.json();
    },
    refetchInterval: 15000,
  });
}

export function useApproveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/analytics/approvals/${id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolvedBy: 'ui-approver' }),
      });
      if (!res.ok) throw new Error('Błąd zatwierdzenia');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals'] }),
  });
}

export function useRejectRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/analytics/approvals/${id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolvedBy: 'ui-approver' }),
      });
      if (!res.ok) throw new Error('Błąd odrzucenia');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals'] }),
  });
}
