"use client";

import React from 'react';
import { GitCompare, Layers, Users } from 'lucide-react';
import { usePMBaselineCompare, useCreatePMBaseline, usePMResourceLevel } from '../../hooks/usePM';

export default function GanttBaselinePanel({ projectId }: { projectId: string }) {
  const { data: compare, refetch } = usePMBaselineCompare(projectId);
  const createBaseline = useCreatePMBaseline();
  const levelResources = usePMResourceLevel();

  if (!projectId) return null;

  return (
    <div className="bg-slate-900/60 border border-indigo-800/40 rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-indigo-400" />
          Baseline Gantt + Resource Leveling
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => createBaseline.mutate({ projectId }, { onSuccess: () => refetch() })}
            disabled={createBaseline.isPending}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 rounded-lg text-xs font-semibold"
          >
            <Layers className="w-3.5 h-3.5" /> Zapisz baseline
          </button>
          <button
            type="button"
            onClick={() => levelResources.mutate(projectId)}
            disabled={levelResources.isPending}
            className="flex items-center gap-1 px-3 py-1.5 border border-indigo-600/50 text-indigo-300 rounded-lg text-xs font-semibold"
          >
            <Users className="w-3.5 h-3.5" /> Level resources
          </button>
        </div>
      </div>

      {compare?.error ? (
        <p className="text-sm text-slate-500">Brak baseline — zapisz pierwszy snapshot harmonogramu.</p>
      ) : compare ? (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800 text-center">
              <div className="text-[10px] text-slate-500 uppercase">Baseline</div>
              <div className="text-xl font-bold text-indigo-300">{compare.baselineDuration}d</div>
            </div>
            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800 text-center">
              <div className="text-[10px] text-slate-500 uppercase">Aktualny</div>
              <div className="text-xl font-bold text-white">{compare.currentDuration}d</div>
            </div>
            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800 text-center">
              <div className="text-[10px] text-slate-500 uppercase">Wariancja</div>
              <div className={`text-xl font-bold ${compare.durationVariance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {compare.durationVariance > 0 ? '+' : ''}{compare.durationVariance}d
              </div>
            </div>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {(compare.variances ?? []).map((v) => (
              <div key={v.id} className="flex items-center gap-3 text-xs py-1 border-b border-slate-800/30">
                <span className="w-36 truncate text-slate-300">{v.name}</span>
                <span className={`px-2 py-0.5 rounded font-mono ${
                  v.status === 'LATE' ? 'bg-rose-900/40 text-rose-300'
                    : v.status === 'AHEAD' ? 'bg-emerald-900/40 text-emerald-300'
                    : 'bg-slate-800 text-slate-400'
                }`}>{v.slipDays > 0 ? `+${v.slipDays}d` : `${v.slipDays}d`}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-500">Ładowanie porównania baseline…</p>
      )}

      {levelResources.data?.conflicts?.length ? (
        <div className="mt-4 p-3 bg-amber-900/20 border border-amber-700/40 rounded-lg text-xs text-amber-200">
          {(levelResources.data.conflicts as { resource: string; suggestion: string }[]).map((c, i) => (
            <div key={i}>{c.resource}: {c.suggestion}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
