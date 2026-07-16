"use client";

import React, { useState } from 'react';
import { LineChart, Loader2, Plus } from 'lucide-react';
import { useSpcCharacteristics, useSpcChart, useRecordSpcMeasurement } from '../../hooks/useQuality';

export default function SpcPanel() {
  const { data: chars = [], isLoading } = useSpcCharacteristics();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeId = selectedId ?? chars[0]?.id ?? null;
  const { data: chart, isLoading: chartLoading } = useSpcChart(activeId);
  const record = useRecordSpcMeasurement();
  const [value, setValue] = useState('');

  const submit = async () => {
    if (!activeId || !value) return;
    await record.mutateAsync({ characteristicId: activeId, value: parseFloat(value) });
    setValue('');
  };

  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-2">
        <LineChart className="w-5 h-5 text-amber-400" />
        <h2 className="font-bold text-white">SPC — Kontrola statystyczna procesu</h2>
      </div>
      {isLoading ? (
        <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
      ) : (
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            {chars.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  c.id === activeId ? 'border-amber-500/50 bg-amber-500/10' : 'border-slate-700 hover:bg-slate-800'
                }`}
              >
                <div className="font-semibold text-white text-sm">{c.name}</div>
                <div className="text-xs text-slate-500">{c.sku} · {c.unit}</div>
              </button>
            ))}
          </div>
          <div className="lg:col-span-2 space-y-4">
            {chartLoading || !chart ? (
              <div className="text-slate-500 text-sm">Wybierz cechę SPC…</div>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-3 text-center">
                  {[
                    { label: 'Średnia', val: chart.limits.mean?.toFixed(3) },
                    { label: 'UCL', val: chart.limits.ucl?.toFixed(3) },
                    { label: 'LCL', val: chart.limits.lcl?.toFixed(3) },
                    { label: 'Cpk', val: chart.limits.cpk ?? '—' },
                  ].map((s) => (
                    <div key={s.label} className="bg-slate-950/50 rounded-lg p-3 border border-slate-800">
                      <div className="text-[10px] uppercase text-slate-500">{s.label}</div>
                      <div className="text-lg font-bold text-amber-300">{s.val}</div>
                    </div>
                  ))}
                </div>
                <div className="h-32 flex items-end gap-1 px-2">
                  {chart.points.map((p, i) => {
                    const range = chart.limits.ucl - chart.limits.lcl || 1;
                    const h = Math.max(4, ((p.value - chart.limits.lcl) / range) * 100);
                    return (
                      <div
                        key={p.id || i}
                        title={`${p.value} @ ${p.measuredAt}`}
                        className={`flex-1 rounded-t ${p.inControl ? 'bg-emerald-500/70' : 'bg-rose-500/80'}`}
                        style={{ height: `${Math.min(100, h)}%` }}
                      />
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.001"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={`Nowy pomiar (${chart.characteristic.unit})`}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={submit}
                    disabled={record.isPending}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Zapisz
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
