import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Payable {
  id: string;
  vendor: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: 'PENDING' | 'OVERDUE' | 'PAID';
  orderRef: string;
}

export interface Receivable {
  id: string;
  client: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: 'PENDING' | 'OVERDUE' | 'PAID';
  invoiceRef: string;
}

export function usePayables() {
  return useQuery<Payable[]>({
    queryKey: ['fin-payables'],
    queryFn: async () => {
      const res = await fetch('http://localhost:4005/api/fin/payables');
      if (!res.ok) throw new Error('Nie udało się pobrać zobowiązań');
      return res.json();
    },
  });
}

export function useReceivables() {
  return useQuery<Receivable[]>({
    queryKey: ['fin-receivables'],
    queryFn: async () => {
      const res = await fetch('http://localhost:4005/api/fin/receivables');
      if (!res.ok) throw new Error('Nie udało się pobrać należności');
      return res.json();
    },
  });
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  milestone: string;
  amount: number;
  percent?: number;
  status: string;
  reachedAt?: string;
  invoicedAt?: string;
}

export interface WipAccountRow {
  projectId: string;
  wipBalance: number;
  laborCost: number;
  materialReserved: number;
  tenantId?: string;
}

export function useWipAccounts() {
  return useQuery<WipAccountRow[]>({
    queryKey: ['fin-wip'],
    queryFn: async () => {
      const res = await fetch('http://localhost:4005/api/fin/wip');
      if (!res.ok) throw new Error('Nie udało się pobrać WIP');
      return res.json();
    },
    refetchInterval: 20000,
  });
}

export function useProjectMilestones() {
  return useQuery<ProjectMilestone[]>({
    queryKey: ['fin-milestones'],
    queryFn: async () => {
      const res = await fetch('/api/fin/milestones');
      if (!res.ok) throw new Error('Nie udało się pobrać milestoneów');
      return res.json();
    },
    refetchInterval: 15000,
  });
}

export interface GlAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
}

export interface JournalEntry {
  id: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  description?: string;
  referenceId?: string;
  source?: string;
  createdAt: string;
  account: { code: string; name: string };
}

export interface BudgetVarianceRow {
  projectId: string;
  projectName: string;
  budget: number;
  actualCost: number;
  variance: number;
  percentUsed: number;
  status: 'OK' | 'WARNING' | 'OVER';
}

export function useBudgetVariance() {
  return useQuery<{ rows: BudgetVarianceRow[]; generatedAt: string }>({
    queryKey: ['fin-budget-variance'],
    queryFn: async () => {
      const res = await fetch('/api/fin/budget-variance');
      if (!res.ok) throw new Error('Błąd budżetu vs wykonanie');
      return res.json();
    },
    refetchInterval: 20000,
  });
}

export function useGlAccounts() {
  return useQuery<GlAccount[]>({
    queryKey: ['fin-accounts'],
    queryFn: async () => {
      const res = await fetch('/api/fin/accounts');
      if (!res.ok) throw new Error('Błąd planu kont');
      return res.json();
    },
  });
}

export function useJournalEntries() {
  return useQuery<JournalEntry[]>({
    queryKey: ['fin-journal'],
    queryFn: async () => {
      const res = await fetch('/api/fin/journal');
      if (!res.ok) throw new Error('Błąd dziennika');
      return res.json();
    },
    refetchInterval: 10000,
  });
}

export interface FixedAsset {
  id: string;
  code: string;
  name: string;
  category: string;
  acquisitionCost: number;
  salvageValue: number;
  usefulLifeMonths: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  status: string;
}

export function useFixedAssets() {
  return useQuery<FixedAsset[]>({
    queryKey: ['fin-fixed-assets'],
    queryFn: async () => {
      const res = await fetch('/api/fin/fixed-assets');
      if (!res.ok) throw new Error('Błąd środków trwałych');
      return res.json();
    },
  });
}

export function useRunDepreciation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/fin/fixed-assets/depreciate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error('Błąd amortyzacji');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-fixed-assets'] }),
  });
}

export function usePostJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      accountCode: string;
      amount: number;
      type: 'DEBIT' | 'CREDIT';
      description?: string;
    }) => {
      const res = await fetch('/api/fin/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Błąd księgowania');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-journal'] });
      qc.invalidateQueries({ queryKey: ['fin-accounts'] });
    },
  });
}
