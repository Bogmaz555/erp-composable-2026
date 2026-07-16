'use client';

import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface ReadinessCheck {
  id: string;
  label: string;
  ok: boolean;
  status?: string;
}

export default function ProductionReadinessPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['production-readiness'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/platform/production/readiness', {
        headers: { 'X-Tenant-Id': 'default' },
      });
      if (!res.ok) throw new Error('Production readiness unavailable');
      return res.json() as Promise<{
        ready: boolean;
        score: number;
        passed: number;
        total: number;
        checks: ReadinessCheck[];
        blocked?: string[];
      }>;
    },
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="glass-panel p-6 animate-pulse">
        <div className="h-6 w-48 bg-white/10 rounded mb-4" />
        <div className="h-24 bg-white/5 rounded" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className={`w-5 h-5 ${data.ready ? 'text-emerald-400' : 'text-amber-400'}`} />
          <h3 className="text-lg font-semibold text-white">Production Readiness</h3>
        </div>
        <span className={`text-sm font-bold px-3 py-1 rounded-full ${
          data.score >= 80 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
        }`}>
          {data.score}%
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
        {(data.checks ?? []).map((c) => (
          <div key={c.id} className="flex items-center gap-2 text-xs bg-black/20 rounded-lg px-3 py-2 border border-white/5">
            {c.ok ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            )}
            <span className="text-gray-300 truncate">{c.label}</span>
            {c.status && <span className="text-gray-500 ml-auto">{c.status}</span>}
          </div>
        ))}
      </div>
      {data.blocked && data.blocked.length > 0 && (
        <div className="flex items-start gap-2 text-xs text-gray-500 mt-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{data.blocked.join(' · ')}</span>
        </div>
      )}
    </div>
  );
}
