import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Product {
  id: string;
  partNumber: string;
  name: string;
  description?: string | null;
  type: string;
  unitOfMeasure: string;
  category?: string | null;
  material?: string | null;
  weightKg?: number | null;
  lifecycleStatus: 'DRAFT' | 'ACTIVE' | 'OBSOLETE';
  makeBuy: 'MAKE' | 'BUY' | 'PHANTOM';
  revision?: string | null;
  barcode?: string | null;
  leadTimeDays?: number | null;
  standardCost?: number | null;
  currency: string;
  isActive: boolean;
  attributes?: Record<string, any> | null;
  updatedAt?: string;
  createdAt?: string;
}

export interface ProductListResult {
  rows: Product[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface ProductFilters {
  search?: string;
  type?: string;
  status?: string;
  makeBuy?: string;
  active?: string;
  page?: number;
  pageSize?: number;
}

const BASE = '/api/plm/items';

function buildQuery(filters: ProductFilters): string {
  const p = new URLSearchParams();
  if (filters.search) p.set('search', filters.search);
  if (filters.type) p.set('type', filters.type);
  if (filters.status) p.set('status', filters.status);
  if (filters.makeBuy) p.set('makeBuy', filters.makeBuy);
  if (filters.active) p.set('active', filters.active);
  p.set('page', String(filters.page ?? 1));
  p.set('pageSize', String(filters.pageSize ?? 25));
  return p.toString();
}

export function useProducts(filters: ProductFilters) {
  return useQuery<ProductListResult>({
    queryKey: ['products', filters],
    queryFn: async () => {
      const res = await fetch(`${BASE}?${buildQuery(filters)}`);
      if (!res.ok) throw new Error(`Błąd pobierania kartoteki (${res.status})`);
      return res.json();
    },
    placeholderData: (prev) => prev,
  });
}

export function useProductStats() {
  return useQuery({
    queryKey: ['product-stats'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/stats`);
      if (!res.ok) throw new Error('Błąd statystyk');
      return res.json() as Promise<{ total: number; active: number; inactive: number; byType: { type: string; count: number }[] }>;
    },
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Product>) => {
      const res = await fetch(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Nie udało się utworzyć pozycji');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['product-stats'] });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Product> & { id: string }) => {
      const res = await fetch(`${BASE}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Nie udało się zapisać zmian');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['product-stats'] });
    },
  });
}

export function useSetProductActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await fetch(`${BASE}/${id}/${active ? 'activate' : 'deactivate'}`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Nie udało się zmienić statusu');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['product-stats'] });
    },
  });
}
