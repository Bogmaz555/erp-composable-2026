"use client";

import React from 'react';
import { FileCheck, Loader2, RefreshCw } from 'lucide-react';
import { useIsoDocuments, useIsoSummary, useMarkIsoReviewed } from '../../hooks/useQuality';

export default function IsoDocumentsPanel() {
  const { data: docs = [], isLoading } = useIsoDocuments();
  const { data: summary } = useIsoSummary();
  const markReviewed = useMarkIsoReviewed();

  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden mt-8">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-blue-400" />
          <h2 className="font-bold text-white">ISO 9001 — Rejestr dokumentacji</h2>
        </div>
        {summary && (
          <span className="text-xs font-mono text-blue-300">
            Compliance {summary.complianceScore}% · {summary.active}/{summary.total} aktywnych
          </span>
        )}
      </div>
      {isLoading ? (
        <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
      ) : (
        <table className="w-full text-sm text-slate-300">
          <thead className="text-[10px] uppercase text-slate-500 bg-slate-950/30">
            <tr>
              <th className="p-4 text-left">Kod</th>
              <th className="p-4 text-left">Tytuł</th>
              <th className="p-4 text-left">Klauzula</th>
              <th className="p-4 text-left">Właściciel</th>
              <th className="p-4 text-left">Przegląd</th>
              <th className="p-4 text-right">Akcja</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => {
              const overdue = d.reviewDue && new Date(d.reviewDue) < new Date();
              return (
                <tr key={d.id} className="border-t border-slate-800/50">
                  <td className="p-4 font-mono text-white">{d.code}</td>
                  <td className="p-4">{d.title}</td>
                  <td className="p-4 text-blue-400/80">{d.clause}</td>
                  <td className="p-4 text-slate-500">{d.owner ?? '—'}</td>
                  <td className="p-4">
                    <span className={overdue ? 'text-rose-400 font-semibold' : 'text-slate-400'}>
                      {d.reviewDue ? new Date(d.reviewDue).toLocaleDateString('pl-PL') : '—'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      type="button"
                      onClick={() => markReviewed.mutate(d.id)}
                      className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400"
                      title="Oznacz przegląd"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
