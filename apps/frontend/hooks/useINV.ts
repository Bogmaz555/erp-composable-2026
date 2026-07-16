import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface StockLevel {
  id: string;
  quantity: number;
  reservedQuantity: number;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  type: 'RAW_MATERIAL' | 'COMPONENT' | 'FINISHED_GOOD';
  unit: string;
  stockLevels: StockLevel[];
}

export function useINVInventory() {
  return useQuery<InventoryItem[]>({
    queryKey: ['inv-inventory'],
    queryFn: async () => {
      const res = await fetch('/api/inv/inventory');
      if (!res.ok) throw new Error('Nie udało się pobrać stanów magazynowych');
      return res.json();
    },
  });
}

export function useINVCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { sku: string; name: string; type: string; unit: string }) => {
      const res = await fetch('/api/inv/inventory/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Nie udało się zapisać nowego asortymentu');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inv-inventory'] });
    },
  });
}

export interface LotRecord {
  id: string;
  lotNumber: string;
  serialNumber?: string | null;
  quantity: number;
  location?: string | null;
  status: string;
  itemId: string;
  item?: { sku: string; name: string };
}

export function useINVLots(itemId?: string) {
  const q = itemId ? `?itemId=${itemId}` : '';
  return useQuery<LotRecord[]>({
    queryKey: ['inv-lots', itemId],
    queryFn: async () => {
      const res = await fetch(`/api/inv/inventory/lots${q}`);
      if (!res.ok) throw new Error('Błąd pobierania partii');
      return res.json();
    },
  });
}

export function useINVCreateLot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { itemId: string; lotNumber: string; serialNumber?: string; quantity: number; location?: string }) => {
      const res = await fetch('/api/inv/inventory/lots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Nie udało się utworzyć partii');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inv-lots'] });
      qc.invalidateQueries({ queryKey: ['inv-inventory'] });
    },
  });
}

export function useINVGenealogyForward(serialOrLot: string | null) {
  return useQuery({
    queryKey: ['inv-genealogy-fwd', serialOrLot],
    queryFn: async () => {
      const res = await fetch(`/api/inv/inventory/genealogy/forward/${encodeURIComponent(serialOrLot!)}`);
      if (!res.ok) throw new Error('Błąd genealogii forward');
      return res.json();
    },
    enabled: !!serialOrLot,
  });
}

export function useINVGenealogyBackward(params: { childLotId?: string; bomComponentId?: string } | null) {
  const qs = params?.childLotId
    ? `childLotId=${encodeURIComponent(params.childLotId)}`
    : params?.bomComponentId
      ? `bomComponentId=${encodeURIComponent(params.bomComponentId)}`
      : '';
  return useQuery({
    queryKey: ['inv-genealogy-bwd', params],
    queryFn: async () => {
      const res = await fetch(`/api/inv/inventory/genealogy/backward?${qs}`);
      if (!res.ok) throw new Error('Błąd genealogii backward');
      return res.json();
    },
    enabled: !!(params?.childLotId || params?.bomComponentId),
  });
}

export function useINVGenealogyChain(serialOrLot: string | null) {
  return useQuery({
    queryKey: ['inv-genealogy-chain', serialOrLot],
    queryFn: async () => {
      const res = await fetch(`/api/inv/inventory/genealogy/chain/${encodeURIComponent(serialOrLot!)}`);
      if (!res.ok) throw new Error('Błąd genealogii chain');
      return res.json();
    },
    enabled: !!serialOrLot,
  });
}

export interface GenealogyE2eStage {
  id: string;
  label: string;
  domain: 'PLM' | 'PM' | 'MES' | 'INV' | 'FIN';
  ok: boolean;
  status: string;
  count?: number;
  detail?: string;
}

export function useGenealogyE2eView(serialOrLot: string | null) {
  return useQuery({
    queryKey: ['genealogy-e2e-view', serialOrLot],
    queryFn: async () => {
      const res = await fetch(
        `/api/analytics/traceability/e2e/view?serialOrLot=${encodeURIComponent(serialOrLot!)}`,
        { headers: { 'X-Tenant-Id': 'default' } },
      );
      if (!res.ok) throw new Error('E2E view unavailable');
      return res.json() as Promise<{
        ready: boolean;
        td004: string;
        stagesPassed: number;
        stagesTotal: number;
        stages: GenealogyE2eStage[];
        spineComplete: boolean;
        chainSummary?: Record<string, unknown>;
      }>;
    },
    enabled: !!serialOrLot,
    refetchInterval: 30000,
  });
}

export interface StorageBin {
  id: string;
  code: string;
  zone: string;
  capacity?: number;
  warehouse?: { code: string; name: string };
}

export interface PickLine {
  id: string;
  sku: string;
  quantity: number;
  binCode?: string;
  pickedQty: number;
  status: string;
}

export interface PickList {
  id: string;
  pickNumber: string;
  projectId?: string;
  status: string;
  lines: PickLine[];
}

export function useWmsBins() {
  return useQuery<StorageBin[]>({
    queryKey: ['inv-wms-bins'],
    queryFn: async () => {
      const res = await fetch('/api/inv/wms/bins');
      if (!res.ok) throw new Error('Błąd lokalizacji WMS');
      return res.json();
    },
  });
}

export function useWmsPickLists() {
  return useQuery<PickList[]>({
    queryKey: ['inv-wms-picks'],
    queryFn: async () => {
      const res = await fetch('/api/inv/wms/pick-lists');
      if (!res.ok) throw new Error('Błąd list kompletacji');
      return res.json();
    },
    refetchInterval: 8000,
  });
}

export function useCreatePickList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload?: { projectId?: string }) => {
      const res = await fetch('/api/inv/wms/pick-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload ?? {}),
      });
      if (!res.ok) throw new Error('Błąd generowania pick list');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inv-wms-picks'] }),
  });
}

export function useConfirmPick() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { pickListId: string; lineId: string; pickedQty: number }) => {
      const res = await fetch(`/api/inv/wms/pick-lists/${payload.pickListId}/lines/${payload.lineId}/pick`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickedQty: payload.pickedQty }),
      });
      if (!res.ok) throw new Error('Błąd potwierdzenia pick');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inv-wms-picks'] }),
  });
}

export function useINVAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { itemId: string; quantity: number }) => {
      const res = await fetch('/api/inv/inventory/stock/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Nie udało się skorygować stanu magazynowego');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inv-inventory'] });
    },
  });
}
