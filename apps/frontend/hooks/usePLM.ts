import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface BomSummary {
  id: string;
  partNumber: string;
  description: string;
  revision: string;
  status: string;
  components: { childItemId: string; childPartNumber?: string; quantity: number; position?: number; scrapFactor?: number }[];
}

export interface BomTreeNode {
  id: string;
  childItemId: string;
  quantity: number;
  position?: number;
  scrapFactor?: number;
  childItem?: { partNumber: string; name: string; type: string };
  subBom?: { version: { revision: string; status: string }; components: BomTreeNode[] };
}

export function usePLMBoms() {
  return useQuery<BomSummary[]>({
    queryKey: ['plm-boms'],
    queryFn: async () => {
      const res = await fetch('/api/plm/boms');
      if (!res.ok) throw new Error('Błąd pobierania BOM');
      return res.json();
    },
  });
}

export function usePLMEcos() {
  return useQuery({
    queryKey: ['plm-ecos'],
    queryFn: async () => {
      const res = await fetch('/api/plm/ecos');
      if (!res.ok) throw new Error('Błąd pobierania ECO');
      return res.json();
    },
  });
}

export function useBomTree(bomVersionId: string | null) {
  return useQuery({
    queryKey: ['plm-bom-tree', bomVersionId],
    queryFn: async () => {
      const res = await fetch(`/api/plm/bom-versions/${bomVersionId}/tree`);
      if (!res.ok) throw new Error('Błąd pobierania drzewa BOM');
      return res.json();
    },
    enabled: !!bomVersionId,
  });
}

export function useCreateBom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { partNumber: string; description: string; revision: string }) => {
      const res = await fetch('/api/plm/boms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, components: [] }),
      });
      if (!res.ok) throw new Error('Nie udało się utworzyć BOM');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plm-boms'] }),
  });
}

export function useCreateEco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title: string; description: string }) => {
      const res = await fetch('/api/plm/ecos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Nie udało się utworzyć ECO');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plm-ecos'] }),
  });
}

export function useAddBomComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bomVersionId, childItemId, quantity, position }: {
      bomVersionId: string; childItemId: string; quantity: number; position?: number;
    }) => {
      const res = await fetch(`/api/plm/bom-versions/${bomVersionId}/components`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childItemId, quantity, position, scrapFactor: 0 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Nie udało się dodać komponentu');
      }
      return res.json();
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['plm-boms'] });
      qc.invalidateQueries({ queryKey: ['plm-bom-tree', vars.bomVersionId] });
    },
  });
}

export function useEtoExplosion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { bomVersionId: string; projectId?: string }) => {
      const res = await fetch('/api/analytics/eto-chain/plm-explosion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'ETO explosion failed');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plm-boms'] });
      qc.invalidateQueries({ queryKey: ['eto-chain'] });
      qc.invalidateQueries({ queryKey: ['traceability-spine'] });
    },
  });
}

export function useReleaseBom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bomVersionId: string) => {
      const res = await fetch(`/api/plm/bom-versions/${bomVersionId}/release`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ releasedBy: 'ui-user' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Nie udało się zwolnić BOM');
      }
      return res.json();
    },
    onSuccess: (_d, bomVersionId) => {
      qc.invalidateQueries({ queryKey: ['plm-boms'] });
      qc.invalidateQueries({ queryKey: ['plm-bom-tree', bomVersionId] });
    },
  });
}

/** @deprecated use granular hooks above */
export function usePLM() {
  const boms = usePLMBoms();
  const ecos = usePLMEcos();
  return {
    boms: boms.data ?? [],
    ecos: ecos.data ?? [],
    loading: boms.isLoading || ecos.isLoading,
    error: boms.error?.message || ecos.error?.message || null,
    refetch: () => { boms.refetch(); ecos.refetch(); },
  };
}
