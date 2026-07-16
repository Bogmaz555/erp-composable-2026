'use client';

import { Activity, AlertTriangle, CheckCircle2, Server, XCircle } from 'lucide-react';
import { useCommandCenter } from '../hooks/useCommandCenter';

function StatusIcon({ status }: { status: string }) {
  if (status === 'UP') return <CheckCircle2 className="w-4 h-4 text-green-400" />;
  if (status === 'DEGRADED') return <AlertTriangle className="w-4 h-4 text-amber-400" />;
  return <XCircle className="w-4 h-4 text-red-400" />;
}

export default function CommandCenterPanel() {
  const { data, isLoading, error } = useCommandCenter();

  if (isLoading) {
    return (
      <div className="glass-panel p-6 animate-pulse">
        <div className="h-6 w-48 bg-white/10 rounded mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 bg-white/5 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-panel p-6 border border-red-500/30">
        <p className="text-red-400 text-sm">Command Center niedostępny — uruchom analytics + gateway</p>
      </div>
    );
  }

  const { summary, services, regression } = data;
  const direct = services.filter((s) => s.layer === 'direct');
  const gateway = services.filter((s) => s.layer === 'gateway');

  return (
    <div className="glass-panel p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30">
            <Server className="w-5 h-5 text-indigo-300" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Command Center</h3>
            <p className="text-xs text-gray-400">Health matrix · regression · orchestrator</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">{summary.healthScore}%</p>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Health</p>
          </div>
          {regression?.score != null && (
            <div className="text-center">
              <p className="text-2xl font-bold text-cyan-400">{regression.score}%</p>
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Regression</p>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <Activity className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs text-gray-300">{summary.up}/{summary.total} UP</span>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Serwisy (direct)</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
          {direct.map((s) => (
            <div
              key={s.name}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
                s.status === 'UP'
                  ? 'bg-green-500/5 border-green-500/20'
                  : s.status === 'DEGRADED'
                    ? 'bg-amber-500/5 border-amber-500/20'
                    : 'bg-red-500/5 border-red-500/20'
              }`}
            >
              <StatusIcon status={s.status} />
              <div className="min-w-0">
                <p className="font-medium text-white truncate">{s.name}</p>
                <p className="text-gray-500">:{s.port} · {s.latencyMs}ms</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {gateway.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Gateway E2E</p>
          <div className="flex flex-wrap gap-2">
            {gateway.map((s) => (
              <span
                key={s.name}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border ${
                  s.status === 'UP' ? 'border-green-500/30 text-green-300' : 'border-red-500/30 text-red-300'
                }`}
              >
                <StatusIcon status={s.status} />
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {regression && (
        <p className="text-xs text-gray-500">
          Ostatni regression: {regression.passed}/{regression.total} passed
          {regression.generatedAt && ` · ${new Date(regression.generatedAt).toLocaleString('pl-PL')}`}
        </p>
      )}
    </div>
  );
}
