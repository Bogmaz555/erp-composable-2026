"use client";

import React, { useState } from 'react';
import { Search, GitBranch, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useINVGenealogyForward, useINVGenealogyBackward, useINVGenealogyChain, useGenealogyE2eView } from '../../hooks/useINV';
import { Field, TextInput } from '../../components/ui/Field';

const DOMAIN_COLORS: Record<string, string> = {
  PLM: 'border-violet-500/40 bg-violet-500/10 text-violet-300',
  PM: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
  MES: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
  INV: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  FIN: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
};

export default function GenealogyPanel() {
  const [mode, setMode] = useState<'forward' | 'backward' | 'chain' | 'e2e'>('e2e');
  const [fwdQuery, setFwdQuery] = useState('SN-MACHINE-ETO-001');
  const [bwdLot, setBwdLot] = useState('');
  const [bwdBom, setBwdBom] = useState('');
  const [activeFwd, setActiveFwd] = useState<string | null>(null);
  const [activeBwd, setActiveBwd] = useState<{ childLotId?: string; bomComponentId?: string } | null>(null);

  const [activeChain, setActiveChain] = useState<string | null>('SN-MACHINE-ETO-001');
  const [activeE2e, setActiveE2e] = useState<string | null>('SN-MACHINE-ETO-001');

  const fwd = useINVGenealogyForward(activeFwd);
  const bwd = useINVGenealogyBackward(activeBwd);
  const chain = useINVGenealogyChain(activeChain);
  const e2e = useGenealogyE2eView(activeE2e);

  const search = () => {
    if (mode === 'forward') setActiveFwd(fwdQuery.trim() || null);
    else if (mode === 'chain') setActiveChain(fwdQuery.trim() || null);
    else if (mode === 'e2e') setActiveE2e(fwdQuery.trim() || null);
    else setActiveBwd({
      childLotId: bwdLot.trim() || undefined,
      bomComponentId: bwdBom.trim() || undefined,
    });
  };

  const result = mode === 'forward' ? fwd : mode === 'chain' ? chain : mode === 'e2e' ? e2e : bwd;
  const links = mode === 'e2e' ? [] : (result.data as { links?: unknown[] })?.links ?? [];
  const summary = mode === 'chain' ? (result.data as { summary?: Record<string, unknown> })?.summary : null;

  return (
    <div className="space-y-6">
      <div className="flex gap-2 bg-slate-900/60 p-1 rounded-lg border border-slate-700/50 w-max flex-wrap">
        {(['e2e', 'forward', 'backward', 'chain'] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
              mode === m ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {m === 'e2e' ? 'E2E Spine' : m === 'forward' ? 'Forward' : m === 'backward' ? 'Backward' : 'Chain ETO'}
          </button>
        ))}
      </div>

      <div className="bg-slate-900/60 border border-slate-700/50 p-5 rounded-2xl flex flex-wrap gap-4 items-end">
        {mode === 'forward' || mode === 'chain' || mode === 'e2e' ? (
          <div className="flex-1 min-w-[240px]">
            <Field label="Numer seryjny / LOT maszyny">
              <TextInput value={fwdQuery} onChange={(e) => setFwdQuery(e.target.value)} placeholder="SN-MACHINE-ETO-001" />
            </Field>
          </div>
        ) : (
          <>
            <div className="flex-1 min-w-[200px]">
              <Field label="ID partii (childLotId)">
                <TextInput value={bwdLot} onChange={(e) => setBwdLot(e.target.value)} placeholder="uuid partii" />
              </Field>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Field label="lub bomComponentId">
                <TextInput value={bwdBom} onChange={(e) => setBwdBom(e.target.value)} placeholder="uuid linii BOM" />
              </Field>
            </div>
          </>
        )}
        <button onClick={search}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold flex items-center gap-2">
          <Search className="w-4 h-4" /> Śledź
        </button>
      </div>

      {result.isLoading && (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
      )}
      {result.error && (
        <p className="text-rose-400 text-sm">{(result.error as Error).message}</p>
      )}

      {mode === 'e2e' && e2e.data && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className={`text-xs px-3 py-1 rounded-full border ${e2e.data.ready ? 'bg-green-500/10 text-green-300 border-green-500/30' : 'bg-amber-500/10 text-amber-300 border-amber-500/30'}`}>
              E2E {e2e.data.ready ? 'READY' : 'PARTIAL'} · {e2e.data.stagesPassed}/{e2e.data.stagesTotal} · td004={e2e.data.td004}
            </span>
            {e2e.data.spineComplete && (
              <span className="text-[10px] text-violet-300">Spine complete</span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {e2e.data.stages.map((stage, i) => (
              <div key={stage.id} className="relative">
                {i < e2e.data!.stages.length - 1 && (
                  <div className="hidden sm:block absolute top-1/2 -right-2 w-4 h-0.5 bg-slate-700 z-0" />
                )}
                <div className={`p-4 rounded-xl border ${DOMAIN_COLORS[stage.domain] ?? 'border-slate-700'} relative z-10`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase">{stage.domain}</span>
                    {stage.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : stage.status === 'partial' ? (
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                  </div>
                  <p className="text-xs font-semibold text-white mb-1">{stage.label}</p>
                  <p className="text-lg font-bold">{stage.count ?? '—'}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{stage.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(summary).map(([k, v]) => (
            <div key={k} className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-blue-300">{String(v)}</div>
              <div className="text-[10px] uppercase text-slate-500">{k}</div>
            </div>
          ))}
        </div>
      )}
      {mode !== 'e2e' && result.data && (
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-800 text-sm text-slate-400 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-blue-400" />
            Wyniki: {result.data.count} powiązań
          </div>
          {links.length === 0 ? (
            <p className="p-8 text-center text-slate-500">Brak wpisów genealogii dla podanego kryterium.</p>
          ) : (
            <table className="w-full text-sm text-slate-300">
              <thead className="text-[10px] uppercase text-slate-500 bg-slate-950/30">
                <tr>
                  <th className="p-3 text-left">Parent SN/LOT</th>
                  <th className="p-3 text-left">Child LOT</th>
                  <th className="p-3 text-left">bomComponentId</th>
                  <th className="p-3 text-left">workOrderId</th>
                  <th className="p-3 text-right">Data</th>
                </tr>
              </thead>
              <tbody>
                {links.map((l: any) => (
                  <tr key={l.id} className="border-t border-slate-800/50 hover:bg-slate-800/40">
                    <td className="p-3 font-mono text-xs">{l.parentSerialOrLot}</td>
                    <td className="p-3 font-mono text-xs">{l.childLotId ?? '—'}</td>
                    <td className="p-3 font-mono text-xs truncate max-w-[120px]">{l.bomComponentId ?? '—'}</td>
                    <td className="p-3 font-mono text-xs truncate max-w-[120px]">{l.workOrderId ?? '—'}</td>
                    <td className="p-3 text-right text-xs text-slate-500">
                      {l.consumedAt ? new Date(l.consumedAt).toLocaleString('pl-PL') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
