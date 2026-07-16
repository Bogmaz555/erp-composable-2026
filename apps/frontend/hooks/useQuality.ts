import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = '/api/quality';

export interface QualityInspection {
  id: string;
  referenceId: string;
  type: string;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NonConformanceReport {
  id: string;
  inspectionId: string;
  defectDescription: string;
  severity: string;
  status?: string;
  disposition?: string;
  projectId?: string;
  bomComponentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CapaAction {
  id: string;
  ncrId: string;
  type: string;
  description: string;
  rootCause?: string;
  assignee?: string;
  dueDate?: string;
  status: string;
  createdAt: string;
}

export interface ControlPlan {
  id: string;
  sku: string;
  name: string;
  inspectionType: string;
  aqlLevel: string;
  characteristics?: object[];
}

export interface AqlSample {
  id: string;
  lotSize: number;
  sampleSize: number;
  acceptNumber: number;
  rejectNumber: number;
  defects: number;
  result: string;
  controlPlan?: ControlPlan;
}

export function useControlPlans() {
  return useQuery<ControlPlan[]>({
    queryKey: ['quality-control-plans'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/control-plans`);
      if (!res.ok) throw new Error('Błąd planów kontroli');
      return res.json();
    },
  });
}

export function useAqlSamples() {
  return useQuery<AqlSample[]>({
    queryKey: ['quality-aql-samples'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/aql/samples`);
      if (!res.ok) throw new Error('Błąd próbek AQL');
      return res.json();
    },
    refetchInterval: 10000,
  });
}

export function useRunAql() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { controlPlanId: string; lotSize: number; referenceId?: string }) => {
      const res = await fetch(`${API_URL}/aql/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Błąd uruchomienia AQL');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quality-aql-samples'] }),
  });
}

export interface SpcCharacteristic {
  id: string;
  sku: string;
  name: string;
  unit: string;
  target?: number;
  usl?: number;
  lsl?: number;
}

export interface SpcChart {
  characteristic: SpcCharacteristic;
  limits: { mean: number; ucl: number; lcl: number; cp: number | null; cpk: number | null };
  points: { id: string; value: number; measuredAt: string; inControl: boolean }[];
}

export function useSpcCharacteristics() {
  return useQuery<SpcCharacteristic[]>({
    queryKey: ['quality-spc-chars'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/spc/characteristics`);
      if (!res.ok) throw new Error('Błąd cech SPC');
      return res.json();
    },
  });
}

export function useSpcChart(id: string | null) {
  return useQuery<SpcChart>({
    queryKey: ['quality-spc-chart', id],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/spc/chart/${id}`);
      if (!res.ok) throw new Error('Błąd wykresu SPC');
      return res.json();
    },
    enabled: !!id,
    refetchInterval: 10000,
  });
}

export interface IsoDocument {
  id: string;
  code: string;
  title: string;
  clause: string;
  version: string;
  status: string;
  reviewDue?: string;
  owner?: string;
}

export function useIsoDocuments() {
  return useQuery<IsoDocument[]>({
    queryKey: ['quality-iso-docs'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/iso/documents`);
      if (!res.ok) throw new Error('Błąd dokumentów ISO');
      return res.json();
    },
  });
}

export function useIsoSummary() {
  return useQuery<{ total: number; active: number; overdueReview: number; complianceScore: number }>({
    queryKey: ['quality-iso-summary'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/iso/summary`);
      if (!res.ok) throw new Error('Błąd podsumowania ISO');
      return res.json();
    },
  });
}

export function useMarkIsoReviewed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/iso/documents/${id}/review`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Błąd przeglądu');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quality-iso-docs'] });
      qc.invalidateQueries({ queryKey: ['quality-iso-summary'] });
    },
  });
}

export function useRecordSpcMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { characteristicId: string; value: number; operatorId?: string }) => {
      const res = await fetch(`${API_URL}/spc/measurements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Błąd zapisu pomiaru SPC');
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['quality-spc-chart', vars.characteristicId] });
      qc.invalidateQueries({ queryKey: ['quality-spc-chars'] });
    },
  });
}

export function useRecordAql() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; inspected: number; defects: number; notes?: string }) => {
      const res = await fetch(`${API_URL}/aql/samples/${payload.id}/record`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspected: payload.inspected, defects: payload.defects, notes: payload.notes }),
      });
      if (!res.ok) throw new Error('Błąd zapisu AQL');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quality-aql-samples'] }),
  });
}

export function useQuality() {
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [ncrs, setNcrs] = useState<NonConformanceReport[]>([]);
  const [capa, setCapa] = useState<CapaAction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInspections = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/inspections`);
      if (!res.ok) throw new Error('Failed to fetch inspections');
      const data = await res.json();
      setInspections(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createInspection = async (payload: Partial<QualityInspection>) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/inspections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create inspection');
      await fetchInspections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNcrs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/ncrs`);
      if (!res.ok) throw new Error('Failed to fetch ncrs');
      const data = await res.json();
      setNcrs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createNcr = async (payload: Partial<NonConformanceReport>) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/ncrs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create NCR');
      await fetchNcrs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const closeNcr = async (ncrId: string, disposition: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/ncrs/${ncrId}/close`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disposition, closedBy: 'Quality Lead' }),
      });
      if (!res.ok) throw new Error('Failed to close NCR');
      await fetchNcrs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCapa = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/capa`);
      if (!res.ok) throw new Error('Failed to fetch CAPA');
      setCapa(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  const createCapa = async (
    ncrId: string,
    payload: { description: string; type?: string; assignee?: string; dueDate?: string },
  ) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/ncrs/${ncrId}/capa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create CAPA');
      await fetchCapa();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const updateCapaStatus = async (capaId: string, status: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/capa/${capaId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update CAPA');
      await fetchCapa();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    inspections,
    ncrs,
    capa,
    isLoading,
    error,
    fetchInspections,
    createInspection,
    fetchNcrs,
    createNcr,
    closeNcr,
    fetchCapa,
    createCapa,
    updateCapaStatus,
  };
}
