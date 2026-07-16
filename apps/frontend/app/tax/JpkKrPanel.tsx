"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Download, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function JpkKrPanel() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['jpk-kr', year, month],
    queryFn: async () => {
      const res = await fetch(`/api/tax-legal/jpk/kr?year=${year}&month=${month}`);
      if (!res.ok) throw new Error('Błąd JPK_KR');
      return res.json();
    },
    enabled: false,
  });

  const { data: validation, refetch: validate, isFetching: validating } = useQuery({
    queryKey: ['jpk-kr-validate', year, month],
    queryFn: async () => {
      const res = await fetch(`/api/tax-legal/jpk/kr/validate?year=${year}&month=${month}`);
      if (!res.ok) throw new Error('Błąd walidacji JPK_KR');
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
    a.download = `JPK_KR_${year}-${String(month).padStart(2, '0')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-amber-400" />
        <h2 className="font-bold text-white">JPK_KR — Księga rachunkowa (z GL)</h2>
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
          <button type="button" onClick={() => { refetch(); validate(); }}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-600 rounded-lg text-sm font-semibold">
            Generuj JPK_KR
          </button>
          <button type="button" onClick={() => validate()}
            className="px-4 py-2 border border-emerald-600/50 text-emerald-300 rounded-lg text-sm flex items-center gap-1">
            <ShieldCheck className="w-4 h-4" /> Waliduj MF
          </button>
          {data && (
            <button type="button" onClick={download}
              className="px-4 py-2 border border-amber-600/50 text-amber-300 rounded-lg text-sm flex items-center gap-1">
              <Download className="w-4 h-4" /> Pobierz JSON
            </button>
          )}
        </div>
        {(isLoading || validating) && <Loader2 className="w-5 h-5 animate-spin text-slate-500" />}
        {validation && (
          <div className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${
            validation.valid
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            {validation.valid ? <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
            <div>
              <p className="font-semibold">{validation.valid ? 'Schemat MF OK' : 'Błędy walidacji MF'}</p>
              {validation.errors?.map((e: string) => <p key={e} className="text-xs opacity-90">• {e}</p>)}
              {validation.warnings?.map((w: string) => <p key={w} className="text-xs text-amber-400">⚠ {w}</p>)}
            </div>
          </div>
        )}
        {data && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase">Zapisy</div>
              <div className="text-2xl font-bold text-white">{data.dziennik?.liczbaWierszy}</div>
            </div>
            <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase">Σ Winien</div>
              <div className="text-2xl font-bold text-amber-300">{data.dziennik?.sumaWinien?.toLocaleString('pl-PL')}</div>
            </div>
            <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase">Σ Ma</div>
              <div className="text-2xl font-bold text-amber-300">{data.dziennik?.sumaMa?.toLocaleString('pl-PL')}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
