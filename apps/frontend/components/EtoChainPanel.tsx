'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Factory, Play, CheckCircle2, Circle, Database, Workflow } from 'lucide-react';
import { fetchWithTenant } from '../context/TenantContext';

interface EtoStep {
  id: string;
  done: boolean;
}

interface EtoSagaRow {
  correlationId: string;
  percentComplete: number;
  lastEventAt: string;
}

export default function EtoChainPanel() {
  const qc = useQueryClient();

  const { data, refetch } = useQuery({
    queryKey: ['eto-chain'],
    queryFn: async () => {
      const res = await fetchWithTenant('/api/analytics/eto-chain/status');
      if (!res.ok) throw new Error('ETO chain unavailable');
      return res.json() as Promise<{
        steps: EtoStep[];
        saga: { percentComplete?: number } | null;
        store?: string;
      }>;
    },
    refetchInterval: 15000,
  });

  const { data: orchestrator } = useQuery({
    queryKey: ['eto-orchestrator'],
    queryFn: async () => {
      const res = await fetchWithTenant('/api/analytics/eto-chain/orchestrator/status');
      if (!res.ok) throw new Error('Orchestrator unavailable');
      return res.json() as Promise<{ pending: number; done: number; failed: number }>;
    },
    refetchInterval: 20000,
  });

  const { data: timeouts } = useQuery({
    queryKey: ['eto-workflow-timeouts'],
    queryFn: async () => {
      const res = await fetchWithTenant('/api/analytics/eto-chain/workflow/timeouts');
      if (!res.ok) throw new Error('Workflow timeouts unavailable');
      return res.json() as Promise<{
        totalChainTimeoutMs: number;
        maxStepTimeoutMs: number;
        stepCount: number;
      }>;
    },
    refetchInterval: 60000,
  });

  const { data: temporal } = useQuery({
    queryKey: ['eto-temporal-bridge'],
    queryFn: async () => {
      const res = await fetchWithTenant('/api/analytics/eto-chain/temporal/status');
      if (!res.ok) throw new Error('Temporal bridge unavailable');
      return res.json() as Promise<{
        mode: string;
        temporalReachable: boolean;
        bridgeCycles: number;
        stepCount: number;
      }>;
    },
    refetchInterval: 25000,
  });

  const { data: history } = useQuery({
    queryKey: ['eto-chain-history'],
    queryFn: async () => {
      const res = await fetchWithTenant('/api/analytics/eto-chain/history');
      if (!res.ok) throw new Error('History unavailable');
      return res.json() as Promise<{ sagas: EtoSagaRow[]; store: string; total: number }>;
    },
    refetchInterval: 30000,
  });

  const trigger = useMutation({
    mutationFn: async () => {
      const res = await fetchWithTenant('/api/analytics/eto-chain/trigger-demo', { method: 'POST' });
      if (!res.ok) throw new Error('Trigger failed');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eto-chain'] });
      qc.invalidateQueries({ queryKey: ['eto-chain-history'] });
      qc.invalidateQueries({ queryKey: ['traceability-spine'] });
      refetch();
    },
  });

  const steps = data?.steps ?? [];
  const pct = data?.saga?.percentComplete ?? (steps.filter((s) => s.done).length / Math.max(steps.length, 1)) * 100;
  const store = history?.store ?? data?.store ?? 'json';

  return (
    <div className="glass-panel p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Factory className="w-5 h-5 text-orange-400" />
          <div>
            <h3 className="text-sm font-semibold text-white">ETO Machine Build Chain</h3>
            <p className="text-[10px] text-gray-500">PLM BOM → INV → MES → Finance WIP</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border border-slate-700 text-slate-400">
            <Database className="w-3 h-3" />
            {store}
          </span>
          {timeouts && (
            <span
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border border-cyan-500/30 text-cyan-300"
              title={`Max step: ${timeouts.maxStepTimeoutMs}ms · Chain: ${timeouts.totalChainTimeoutMs}ms`}
            >
              ⏱ {Math.round(timeouts.totalChainTimeoutMs / 1000)}s
            </span>
          )}
          {temporal && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border ${
                temporal.temporalReachable
                  ? 'border-violet-500/40 text-violet-300'
                  : 'border-slate-700 text-slate-400'
              }`}
              title={`Temporal bridge: ${temporal.mode}`}
            >
              <Workflow className="w-3 h-3" />
              {temporal.temporalReachable ? 'temporal' : 'lite'} · {temporal.bridgeCycles}
            </span>
          )}
          {(orchestrator?.pending ?? 0) > 0 && (
            <span className="px-2 py-1 rounded-lg text-[10px] border border-amber-500/30 text-amber-300">
              orch {orchestrator!.pending} pending
            </span>
          )}
          <button
            type="button"
            onClick={() => trigger.mutate()}
            disabled={trigger.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-orange-600 hover:bg-orange-500 text-white font-semibold"
          >
            <Play className="w-3.5 h-3.5" />
            Uruchom demo chain
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-gray-400 w-10">{Math.round(pct)}%</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {steps.map((s) => (
          <span
            key={s.id}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border ${
              s.done ? 'border-green-500/30 text-green-300' : 'border-slate-700 text-slate-500'
            }`}
          >
            {s.done ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
            {s.id.split('.').slice(-2).join('.')}
          </span>
        ))}
      </div>

      {(history?.sagas?.length ?? 0) > 0 && (
        <div className="border-t border-slate-800 pt-3">
          <p className="text-[10px] text-gray-500 mb-2">Historia sag ({history?.total ?? 0})</p>
          <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
            {history!.sagas.slice(0, 5).map((s) => (
              <div key={s.correlationId} className="flex justify-between text-[10px] text-gray-400">
                <span className="truncate max-w-[60%]">{s.correlationId}</span>
                <span>{s.percentComplete}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
