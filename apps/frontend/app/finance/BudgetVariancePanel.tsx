"use client";

import React from 'react';
import { BarChart3, TrendingDown, TrendingUp } from 'lucide-react';
import { useBudgetVariance } from '../../hooks/useFinance';

const fmt = (v: number) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(v);

export default function BudgetVariancePanel() {
  const { data, isLoading } = useBudgetVariance();
  const rows = data?.rows ?? [];

  return (
    <div className="p-6">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-violet-400" />
        Budżet vs Wykonanie (projekty ETO)
      </h3>
      {isLoading && <p className="text-slate-500 text-sm">Ładowanie...</p>}
      {rows.length === 0 && !isLoading && (
        <p className="text-slate-500 text-sm">Brak danych — uruchom seed CCPM w PM lub zaksięguj koszty WIP.</p>
      )}
      <div className="overflow-x-auto border border-slate-800 rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/80 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Projekt</th>
              <th className="px-4 py-3 text-right">Budżet</th>
              <th className="px-4 py-3 text-right">Wykonanie</th>
              <th className="px-4 py-3 text-right">Odchylenie</th>
              <th className="px-4 py-3 text-center">%</th>
              <th className="px-4 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((r) => (
              <tr key={r.projectId} className="hover:bg-slate-800/30">
                <td className="px-4 py-3 font-medium text-slate-200">{r.projectName}</td>
                <td className="px-4 py-3 text-right font-mono">{fmt(r.budget)}</td>
                <td className="px-4 py-3 text-right font-mono text-rose-300">{fmt(r.actualCost)}</td>
                <td className={`px-4 py-3 text-right font-mono font-bold flex items-center justify-end gap-1 ${
                  r.variance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {r.variance >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {fmt(r.variance)}
                </td>
                <td className="px-4 py-3 text-center font-mono">{r.percentUsed}%</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    r.status === 'OVER' ? 'bg-rose-900/40 text-rose-300' :
                    r.status === 'WARNING' ? 'bg-amber-900/40 text-amber-300' :
                    'bg-emerald-900/40 text-emerald-300'
                  }`}>{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
