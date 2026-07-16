"use client";

import React from 'react';
import { Calculator, Play, RefreshCw, Radar } from 'lucide-react';
import { useMrpNetting, useMrpRun, useLongLeadRadar } from '../../hooks/usePROC';

export default function MrpPanel({ onRun }: { onRun?: () => void }) {
  const { data, isLoading, refetch } = useMrpNetting();
  const { data: longLead, isLoading: llLoading } = useLongLeadRadar();
  const runMrp = useMrpRun();

  const lines = data?.lines ?? [];
  const longLeadLines = longLead?.recent ?? [];

  return (
    <div className="bg-slate-900/80 border border-violet-800/40 rounded-2xl p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-violet-300 flex items-center gap-2">
          <Calculator className="w-4 h-4" /> MRP II — Netting (zapotrzebowanie netto)
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Przelicz
          </button>
          <button
            type="button"
            onClick={async () => {
              await runMrp.mutateAsync({ createOrders: true });
              refetch();
              onRun?.();
            }}
            disabled={runMrp.isPending || lines.every((l) => l.netRequirement <= 0)}
            className="px-4 py-1.5 text-xs font-bold rounded-lg bg-violet-700 hover:bg-violet-600 text-white flex items-center gap-1 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            {runMrp.isPending ? 'Uruchamianie...' : 'Uruchom MRP → PO'}
          </button>
        </div>
      </div>

      {isLoading && <p className="text-slate-500 text-sm">Obliczanie nettingu...</p>}

      {!isLoading && lines.length === 0 && (
        <p className="text-slate-500 text-sm">Brak pozycji do nettingu — dodaj PO lub stany w INV.</p>
      )}

      <div className="mb-6 p-4 rounded-xl border border-amber-800/40 bg-amber-950/20">
        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2 mb-3">
          <Radar className="w-4 h-4" /> Long-Lead Radar (≥{longLead?.thresholdDays ?? 28} dni)
        </h4>
        {llLoading && <p className="text-slate-500 text-sm">Ładowanie radaru...</p>}
        {!llLoading && (longLead?.longLeadOrders ?? 0) === 0 && (
          <p className="text-slate-500 text-sm">Brak zamówień LONG_LEAD — komponenty z długim lead time pojawią się po BOM release.</p>
        )}
        {longLeadLines.length > 0 && (
          <div className="overflow-x-auto border border-slate-800/60 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950/60 text-slate-500 uppercase">
                <tr>
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2 text-right">Ilość</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Projekt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {longLeadLines.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-800/20">
                    <td className="px-3 py-2 font-mono text-amber-200">{po.sku}</td>
                    <td className="px-3 py-2 text-right font-mono">{po.amount}</td>
                    <td className="px-3 py-2 text-slate-400">{po.status}</td>
                    <td className="px-3 py-2 text-slate-500">{po.projectId ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!llLoading && (longLead?.longLeadOrders ?? 0) > 0 && (
          <p className="text-amber-400/80 text-xs mt-2">Aktywne PO LONG_LEAD: {longLead?.longLeadOrders}</p>
        )}
      </div>

      {lines.length > 0 && (
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-950/80 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3 text-right">Brutto</th>
                <th className="px-4 py-3 text-right">Stan</th>
                <th className="px-4 py-3 text-right">W drodze</th>
                <th className="px-4 py-3 text-right">Netto</th>
                <th className="px-4 py-3 text-center">Lead (dni)</th>
                <th className="px-4 py-3">Data zamówienia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {lines.map((l) => (
                <tr key={l.sku} className="hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-mono text-violet-300">{l.sku}</td>
                  <td className="px-4 py-3 text-right font-mono">{l.grossRequirement}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-400">{l.onHand}</td>
                  <td className="px-4 py-3 text-right font-mono text-cyan-400">{l.onOrder}</td>
                  <td className={`px-4 py-3 text-right font-mono font-bold ${l.netRequirement > 0 ? 'text-amber-300' : 'text-slate-500'}`}>
                    {l.netRequirement}
                  </td>
                  <td className="px-4 py-3 text-center">{l.leadTimeDays}</td>
                  <td className="px-4 py-3 text-slate-400">{l.suggestedOrderDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
