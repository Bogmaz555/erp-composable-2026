import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithTenant } from '../context/TenantContext';
import { useTenant } from '../context/TenantContext';

export interface PurchaseOrder {
  id: string;
  sku: string;
  amount: number;
  status: string;
  projectId?: string | null;
  bomComponentId?: string | null;
  source?: string;
  taskId?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  nip?: string | null;
  email?: string | null;
  currency: string;
  leadTimeDays?: number | null;
}

export function usePROCSuppliers() {
  return useQuery<Supplier[]>({
    queryKey: ['proc-suppliers'],
    queryFn: async () => {
      const res = await fetch('/api/proc/suppliers');
      if (!res.ok) throw new Error('Błąd pobierania dostawców');
      return res.json();
    },
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { code: string; name: string; nip?: string; email?: string }) => {
      const res = await fetch('/api/proc/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Nie udało się dodać dostawcy');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proc-suppliers'] }),
  });
}

export function useCreatePO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { sku: string; amount: number; supplierId?: string; projectId?: string }) => {
      const res = await fetch('/api/proc/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Nie udało się utworzyć PO');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proc-orders'] }),
  });
}

export interface MrpNetLine {
  sku: string;
  grossRequirement: number;
  onHand: number;
  onOrder: number;
  netRequirement: number;
  leadTimeDays: number;
  suggestedOrderDate: string;
  supplierCode?: string;
}

export function useMrpNetting(projectId?: string) {
  const q = projectId ? `?projectId=${projectId}` : '';
  return useQuery<{ lines: MrpNetLine[]; runAt: string }>({
    queryKey: ['proc-mrp-netting', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/proc/mrp/netting${q}`);
      if (!res.ok) throw new Error('Błąd MRP netting');
      return res.json();
    },
    refetchInterval: 15000,
  });
}

export function useMrpRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { projectId?: string; createOrders?: boolean; skus?: string[] }) => {
      const res = await fetch('/api/proc/mrp/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Błąd uruchomienia MRP');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proc-mrp-netting'] });
      qc.invalidateQueries({ queryKey: ['proc-orders'] });
    },
  });
}

export interface LongLeadRadar {
  thresholdDays: number;
  longLeadOrders: number;
  recent: Array<{
    id: string;
    sku: string;
    amount: number;
    status: string;
    source?: string;
    projectId?: string | null;
    createdAt: string;
    supplier?: { code?: string; name?: string };
  }>;
}

export function useLongLeadRadar() {
  const { tenantId } = useTenant();
  return useQuery<LongLeadRadar>({
    queryKey: ['proc-long-lead', tenantId],
    queryFn: async () => {
      const res = await fetchWithTenant('/api/proc/long-lead/radar');
      if (!res.ok) throw new Error('Błąd Long-Lead Radar');
      return res.json();
    },
    refetchInterval: 20000,
  });
}

export function usePROCOrders() {
  const { tenantId } = useTenant();
  return useQuery<PurchaseOrder[]>({
    queryKey: ['proc-orders', tenantId],
    queryFn: async () => {
      const res = await fetchWithTenant('/api/proc/orders');
      if (!res.ok) throw new Error('Failed to fetch procurement orders');
      return res.json();
    },
    refetchInterval: 5000,
  });
}
