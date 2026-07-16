'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Database, RefreshCw, Sparkles } from 'lucide-react';
import { useTenant, fetchWithTenant } from '../context/TenantContext';

interface IsolationData {
  tenantId: string;
  isolationMode: string;
  totalRecords: number;
  modules: Record<string, { count: number; status: string; detail?: string }>;
}

export default function TenantIsolationPanel() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery<IsolationData>({
    queryKey: ['tenant-isolation', tenantId],
    queryFn: async () => {
      const res = await fetchWithTenant(`/api/analytics/tenants/${tenantId}/isolation`);
      if (!res.ok) throw new Error('Isolation snapshot failed');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const provision = useMutation({
    mutationFn: async () => {
      const res = await fetchWithTenant(`/api/analytics/tenants/${tenantId}/provision`, { method: 'POST' });
      if (!res.ok) throw new Error('Provision failed');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-isolation', tenantId] });
      qc.invalidateQueries({ queryKey: ['proc-orders', tenantId] });
    },
  });

  if (isLoading || !data) {
    return (
      <div className="glass-panel p-4 animate-pulse h-24" />
    );
  }

  return (
    <div className="glass-panel p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Tenant Isolation — {tenantId}</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            {data.isolationMode}
          </span>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => refetch()} className="p-1.5 rounded-lg hover:bg-white/5">
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            type="button"
            onClick={() => provision.mutate()}
            disabled={provision.isPending}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border border-violet-500/30 text-violet-300 hover:bg-violet-500/10"
          >
            <Sparkles className="w-3 h-3" />
            Provision demo
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(data.modules).map(([mod, info]) => (
          <span
            key={mod}
            className={`text-xs px-2.5 py-1 rounded-lg border ${
              info.status === 'ok' ? 'border-green-500/20 text-green-300' : 'border-red-500/20 text-red-300'
            }`}
          >
            {mod}: {info.count}
          </span>
        ))}
        <span className="text-xs px-2.5 py-1 rounded-lg bg-white/5 text-gray-300">
          Σ {data.totalRecords} rekordów
        </span>
      </div>
    </div>
  );
}
