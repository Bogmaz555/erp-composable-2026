import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface MesOperation {
  id: string;
  workOrderId: string;
  sequence: number;
  name: string;
  workCenter?: string | null;
  standardTimeMinutes?: number | null;
  status: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

export function useMESWorkOrders() {
  return useQuery({
    queryKey: ['mes-work-orders'],
    queryFn: async () => {
      const res = await fetch('/api/mes/work-orders');
      if (!res.ok) throw new Error('Błąd pobierania zleceń');
      return res.json();
    },
    refetchInterval: 8000,
  });
}

export function useMESOperations(workOrderId: string | null) {
  return useQuery<MesOperation[]>({
    queryKey: ['mes-operations', workOrderId],
    queryFn: async () => {
      const res = await fetch(`/api/mes/work-orders/${workOrderId}/operations`);
      if (!res.ok) throw new Error('Błąd operacji');
      return res.json();
    },
    enabled: !!workOrderId,
    refetchInterval: 5000,
  });
}

export function useMSEOee() {
  return useQuery({
    queryKey: ['mes-oee'],
    queryFn: async () => {
      const res = await fetch('/api/mes/oee/summary');
      if (!res.ok) throw new Error('Błąd OEE');
      return res.json() as Promise<{ oee: number; availability: number; performance: number; quality: number }>;
    },
    refetchInterval: 15000,
  });
}

export function useMESStartWO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/mes/work-orders/${id}/start`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Start failed');
      return res.json();
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['mes-work-orders'] });
      qc.invalidateQueries({ queryKey: ['mes-operations', id] });
    },
  });
}

export function useMESFinishWO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/mes/work-orders/${id}/finish`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Finish failed');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mes-work-orders'] }),
  });
}

export function useMESOpAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'start' | 'complete' }) => {
      const res = await fetch(`/api/mes/operations/${id}/${action}`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Operation action failed');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mes-operations'] });
      qc.invalidateQueries({ queryKey: ['mes-oee'] });
    },
  });
}
