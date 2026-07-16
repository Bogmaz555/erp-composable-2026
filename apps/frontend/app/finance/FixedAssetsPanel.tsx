"use client";

import React from 'react';
import { Building2, Loader2, Calculator } from 'lucide-react';
import { useFixedAssets, useRunDepreciation } from '../../hooks/useFinance';

export default function FixedAssetsPanel() {
  const { data: assets = [], isLoading } = useFixedAssets();
  const depreciate = useRunDepreciation();

  const totalNbv = assets.reduce((s, a) => s + a.netBookValue, 0);
  const totalCost = assets.reduce((s, a) => s + a.acquisitionCost, 0);

  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-violet-400" />
          <h2 className="font-bold text-white">Środki trwałe (FA)</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-mono">
            Wartość netto: {totalNbv.toLocaleString('pl-PL')} / {totalCost.toLocaleString('pl-PL')} PLN
          </span>
          <button
            type="button"
            onClick={() => depreciate.mutate()}
            disabled={depreciate.isPending}
            className="flex items-center gap-1 px-3 py-1.5 bg-violet-700 hover:bg-violet-600 rounded-lg text-xs font-semibold"
          >
            <Calculator className="w-3.5 h-3.5" />
            Nalicz amortyzację
          </button>
        </div>
      </div>
      {isLoading ? (
        <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
      ) : (
        <table className="w-full text-sm text-slate-300">
          <thead className="text-[10px] uppercase text-slate-500 bg-slate-950/30">
            <tr>
              <th className="p-4 text-left">Kod</th>
              <th className="p-4 text-left">Nazwa</th>
              <th className="p-4 text-left">Kategoria</th>
              <th className="p-4 text-right">Koszt nabycia</th>
              <th className="p-4 text-right">Amortyzacja</th>
              <th className="p-4 text-right">Wartość netto</th>
              <th className="p-4 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id} className="border-t border-slate-800/50">
                <td className="p-4 font-mono text-white">{a.code}</td>
                <td className="p-4">{a.name}</td>
                <td className="p-4 text-xs text-slate-500">{a.category}</td>
                <td className="p-4 text-right font-mono">{a.acquisitionCost.toLocaleString('pl-PL')}</td>
                <td className="p-4 text-right font-mono text-rose-400/80">{a.accumulatedDepreciation.toLocaleString('pl-PL')}</td>
                <td className="p-4 text-right font-mono font-bold text-violet-300">{a.netBookValue.toLocaleString('pl-PL')}</td>
                <td className="p-4"><span className="text-xs px-2 py-0.5 rounded bg-slate-800">{a.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
