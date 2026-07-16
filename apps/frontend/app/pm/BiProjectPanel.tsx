"use client";

import React from 'react';
import { Factory, ShieldAlert, Wallet, Loader2 } from 'lucide-react';
import { useBiDashboard } from '../../hooks/useBiDashboard';

const fmt = (n?: number) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(n ?? 0);

export default function BiProjectPanel({ projectId }: { projectId: string }) {
  const { data, isLoading, isError } = useBiDashboard(projectId);

  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        Ładowanie BI read model…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-slate-900 border border-rose-900/40 rounded-xl p-6 text-rose-400 text-sm">
        Nie udało się pobrać dashboardu BI (live read model).
      </div>
    );
  }

  const cost = data.cost;

  return (
    <div className="bg-slate-900 border border-emerald-900/30 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Wallet className="text-emerald-500 w-5 h-5" />
            BI Read Model (Live)
          </h3>
          <p className="text-xs text-slate-500">PM · Finance · MES · Quality — źródło: {data.source}</p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-emerald-400 border border-emerald-800/40 px-2 py-1 rounded">
          LIVE
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
          <p className="text-[10px] uppercase text-slate-500 font-bold">Plan</p>
          <p className="font-mono text-white font-bold">{fmt(cost?.plannedCost)}</p>
        </div>
        <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
          <p className="text-[10px] uppercase text-slate-500 font-bold">Rzeczywiste</p>
          <p className="font-mono text-emerald-400 font-bold">{fmt(cost?.actualCost)}</p>
        </div>
        <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
          <p className="text-[10px] uppercase text-slate-500 font-bold">Marża %</p>
          <p className="font-mono text-violet-300 font-bold">{cost?.marginPercentage ?? '—'}%</p>
        </div>
        <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
          <p className="text-[10px] uppercase text-slate-500 font-bold">Postęp</p>
          <p className="font-mono text-cyan-300 font-bold">{cost?.progressPercent ?? 0}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-slate-950/40 p-4 rounded-lg border border-slate-800 flex items-start gap-3">
          <Factory className="w-5 h-5 text-amber-400 mt-0.5" />
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold">Produkcja (MES)</p>
            <p className="text-white font-bold">
              {data.manufacturing?.activeWorkOrders ?? 0} aktywne / {data.manufacturing?.workOrderCount ?? 0} WO
            </p>
          </div>
        </div>
        <div className="bg-slate-950/40 p-4 rounded-lg border border-slate-800 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-400 mt-0.5" />
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold">Jakość (NCR)</p>
            <p className="text-white font-bold">
              {data.quality?.openNcr ?? 0} otwarte / {data.quality?.ncrCount ?? 0} łącznie
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
