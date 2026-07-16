"use client";

import React, { useState } from 'react';
import { ClipboardCheck, FlaskConical } from 'lucide-react';
import { useControlPlans, useAqlSamples, useRunAql, useRecordAql } from '../../hooks/useQuality';

export default function ControlPlansPanel() {
  const { data: plans = [], isLoading } = useControlPlans();
  const { data: samples = [], refetch: refetchSamples } = useAqlSamples();
  const runAql = useRunAql();
  const recordAql = useRecordAql();

  const [lotSize, setLotSize] = useState('100');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [defects, setDefects] = useState<Record<string, string>>({});

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-cyan-400" />
          Plany kontroli (ISO 9001)
        </h2>
        {isLoading && <p className="text-slate-500 text-sm">Ładowanie...</p>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div key={p.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-cyan-500">{p.inspectionType}</span>
              <h3 className="font-bold text-white mt-1">{p.name}</h3>
              <p className="text-xs font-mono text-slate-400 mt-1">SKU: {p.sku} · AQL {p.aqlLevel}</p>
            </div>
          ))}
        </div>

        <form
          className="mt-6 flex flex-wrap gap-3 items-end border-t border-slate-800 pt-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!selectedPlan) return;
            await runAql.mutateAsync({
              controlPlanId: selectedPlan,
              lotSize: parseInt(lotSize, 10) || 1,
              referenceId: `LOT-${Date.now()}`,
            });
            refetchSamples();
          }}
        >
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] uppercase text-slate-500 font-bold">Plan kontroli</label>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              required
            >
              <option value="">— wybierz —</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
              ))}
            </select>
          </div>
          <div className="w-28">
            <label className="text-[10px] uppercase text-slate-500 font-bold">Wielkość partii</label>
            <input
              type="number"
              min="1"
              value={lotSize}
              onChange={(e) => setLotSize(e.target.value)}
              className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>
          <button
            type="submit"
            disabled={runAql.isPending}
            className="px-4 py-2.5 bg-cyan-700 hover:bg-cyan-600 text-white text-sm font-bold rounded-lg flex items-center gap-2"
          >
            <FlaskConical className="w-4 h-4" />
            Uruchom AQL
          </button>
        </form>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Próbki AQL (ostatnie)</h2>
        {samples.length === 0 ? (
          <p className="text-slate-500 text-sm">Brak próbek — uruchom inspekcję AQL.</p>
        ) : (
          <div className="space-y-3">
            {samples.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <div>
                  <p className="font-mono text-cyan-400 text-sm">{s.controlPlan?.sku ?? '—'}</p>
                  <p className="text-xs text-slate-500">
                    Partia {s.lotSize} → próbka {s.sampleSize} (Ac={s.acceptNumber}, Re={s.rejectNumber})
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                  s.result === 'ACCEPT' ? 'bg-emerald-900/40 text-emerald-300' :
                  s.result === 'REJECT' ? 'bg-rose-900/40 text-rose-300' :
                  'bg-amber-900/40 text-amber-300'
                }`}>{s.result}</span>
                {s.result === 'PENDING' && (
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      min="0"
                      placeholder="Wady"
                      value={defects[s.id] ?? ''}
                      onChange={(e) => setDefects((d) => ({ ...d, [s.id]: e.target.value }))}
                      className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const d = parseInt(defects[s.id] ?? '0', 10);
                        await recordAql.mutateAsync({ id: s.id, inspected: s.sampleSize, defects: d });
                        refetchSamples();
                      }}
                      className="px-3 py-1 text-xs font-bold bg-slate-700 hover:bg-slate-600 rounded-lg text-white"
                    >
                      Zapisz wynik
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
