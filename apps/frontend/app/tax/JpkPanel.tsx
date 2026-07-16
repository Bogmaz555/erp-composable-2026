"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileSpreadsheet, Download, Loader2 } from 'lucide-react';

export default function JpkPanel() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['jpk-v7', year, month],
    queryFn: async () => {
      const res = await fetch(`/api/tax-legal/jpk/v7?year=${year}&month=${month}`);
      if (!res.ok) throw new Error('Błąd JPK_V7');
      return res.json();
    },
    enabled: false,
  });

  const download = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `JPK_V7M_${year}-${String(month).padStart(2, '0')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-2">
        <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
        <h2 className="font-bold text-white">JPK_V7M — Ewidencja sprzedaży</h2>
      </div>
      <div className="p-6 flex flex-col gap-4">
        <div className="flex flex-wrap gap-3 items-end">
          <label className="text-sm">
            <span className="text-slate-500 block text-xs mb-1">Rok</span>
            <input type="number" value={year} onChange={(e) => setYear(+e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 w-24" />
          </label>
          <label className="text-sm">
            <span className="text-slate-500 block text-xs mb-1">Miesiąc</span>
            <input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(+e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 w-20" />
          </label>
          <button type="button" onClick={() => refetch()}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-sm font-semibold">
            Generuj JPK
          </button>
          {data && (
            <button type="button" onClick={download}
              className="px-4 py-2 border border-emerald-600/50 text-emerald-300 rounded-lg text-sm flex items-center gap-1">
              <Download className="w-4 h-4" /> Pobierz JSON
            </button>
          )}
        </div>
        {isLoading && <Loader2 className="w-5 h-5 animate-spin text-slate-500" />}
        {data && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase">Wiersze</div>
              <div className="text-2xl font-bold text-white">{data.ewidencjaSprzedazy?.liczbaWierszy}</div>
            </div>
            <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase">Suma netto</div>
              <div className="text-2xl font-bold text-emerald-300">{data.ewidencjaSprzedazy?.sumaNetto?.toLocaleString('pl-PL')} PLN</div>
            </div>
            <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase">VAT należny</div>
              <div className="text-2xl font-bold text-emerald-300">{data.ewidencjaSprzedazy?.podatekNalezny?.toLocaleString('pl-PL')} PLN</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
