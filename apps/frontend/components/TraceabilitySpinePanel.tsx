'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GitBranch, Loader2, Sparkles, Link2 } from 'lucide-react';
import { fetchWithTenant } from '../context/TenantContext';

interface SpineData {
  serialOrLot: string;
  spineComplete: boolean;
  genealogy: { count: number; status: string };
  manufacturing: { workOrders: { id?: string; status?: string }[]; status: string };
  finance: { wipAccounts: { projectId?: string; wipBalance?: number }[]; status: string };
}

export default function TraceabilitySpinePanel() {
  const [serial, setSerial] = useState('SN-MACHINE-ETO-001');
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery<SpineData>({
    queryKey: ['traceability-spine', serial],
    queryFn: async () => {
      const res = await fetchWithTenant(
        `/api/analytics/traceability/spine?serialOrLot=${encodeURIComponent(serial)}`,
      );
      if (!res.ok) throw new Error('Spine unavailable');
      return res.json();
    },
    enabled: serial.length > 2,
    refetchInterval: 25000,
  });

  const seed = useMutation({
    mutationFn: async () => {
      const res = await fetchWithTenant('/api/analytics/traceability/seed-demo', { method: 'POST' });
      if (!res.ok) throw new Error('Seed failed');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['traceability-spine'] });
      refetch();
    },
  });

  return (
    <div className="glass-panel p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-violet-400" />
          <div>
            <h3 className="text-sm font-semibold text-white">ETO Traceability Spine</h3>
            <p className="text-[10px] text-gray-500">INV genealogy → MES WO → Finance WIP/GL</p>
          </div>
        </div>
        {data?.spineComplete && (
          <span className="text-[10px] px-2 py-1 rounded-full bg-green-500/10 text-green-300 border border-green-500/20">
            Spine complete
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={serial}
          onChange={(e) => setSerial(e.target.value)}
          placeholder="SN-MACHINE-ETO-001"
          className="px-3 py-2 bg-zinc-950 border border-slate-700 rounded-lg text-sm text-white w-56"
        />
        <button type="button" onClick={() => refetch()}
          className="px-3 py-2 text-xs border border-slate-600 rounded-lg text-slate-300 hover:bg-white/5">
          Odśwież
        </button>
        <button
          type="button"
          onClick={() => seed.mutate()}
          disabled={seed.isPending}
          className="flex items-center gap-1 px-3 py-2 text-xs border border-violet-500/30 text-violet-300 rounded-lg hover:bg-violet-500/10"
        >
          <Sparkles className="w-3 h-3" />
          Seed demo spine
        </button>
      </div>

      {isLoading && <Loader2 className="w-5 h-5 animate-spin text-slate-500" />}

      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/20">
            <div className="flex items-center gap-1 text-[10px] uppercase text-violet-300 mb-1">
              <Link2 className="w-3 h-3" /> Genealogy
            </div>
            <p className="text-xl font-bold text-white">{data.genealogy.count}</p>
            <p className="text-[10px] text-slate-500">{data.genealogy.status}</p>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <div className="text-[10px] uppercase text-blue-300 mb-1">MES Work Orders</div>
            <p className="text-xl font-bold text-white">{data.manufacturing.workOrders.length}</p>
            <p className="text-[10px] text-slate-500">{data.manufacturing.status}</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <div className="text-[10px] uppercase text-amber-300 mb-1">Finance WIP</div>
            <p className="text-xl font-bold text-white">{data.finance.wipAccounts.length}</p>
            <p className="text-[10px] text-slate-500">{data.finance.status}</p>
          </div>
        </div>
      )}
    </div>
  );
}
