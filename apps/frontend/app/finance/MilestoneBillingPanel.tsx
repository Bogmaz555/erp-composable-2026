"use client";

import React from 'react';
import { Flag, FileCheck2, Clock } from 'lucide-react';
import { useProjectMilestones, ProjectMilestone } from '../../hooks/useFinance';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(value);

function statusStyle(status: string) {
  switch (status) {
    case 'INVOICED':
    case 'PAID':
      return 'bg-emerald-900/30 text-emerald-400 border-emerald-800/30';
    case 'READY':
      return 'bg-cyan-900/30 text-cyan-400 border-cyan-800/30';
    case 'RECOGNIZED':
      return 'bg-violet-900/30 text-violet-400 border-violet-800/30';
    default:
      return 'bg-amber-900/30 text-amber-400 border-amber-800/30';
  }
}

export default function MilestoneBillingPanel() {
  const { data: milestones = [], isLoading } = useProjectMilestones();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-300">
        <thead className="text-xs uppercase bg-slate-900/50 text-slate-400 border-b border-slate-800">
          <tr>
            <th className="px-6 py-4">Projekt</th>
            <th className="px-6 py-4">Kamień milowy</th>
            <th className="px-6 py-4 text-right">Kwota</th>
            <th className="px-6 py-4 text-center">%</th>
            <th className="px-6 py-4 text-center">Status</th>
            <th className="px-6 py-4 text-center">KSeF</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {isLoading && (
            <tr>
              <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                Ładowanie milestoneów ETO…
              </td>
            </tr>
          )}
          {!isLoading && milestones.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                <Flag className="w-12 h-12 mx-auto mb-3 opacity-40" />
                Brak zarejestrowanych kamieni milowych (FAT/SAT)
              </td>
            </tr>
          )}
          {milestones.map((m: ProjectMilestone) => (
            <tr key={m.id} className="hover:bg-slate-800/30">
              <td className="px-6 py-4 font-mono text-xs text-slate-400">{m.projectId}</td>
              <td className="px-6 py-4 font-semibold text-slate-200">{m.milestone}</td>
              <td className="px-6 py-4 text-right font-mono">{formatCurrency(m.amount)}</td>
              <td className="px-6 py-4 text-center">{m.percent ?? '—'}%</td>
              <td className="px-6 py-4 text-center">
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${statusStyle(m.status)}`}>
                  {m.status}
                </span>
              </td>
              <td className="px-6 py-4 text-center">
                {m.status === 'INVOICED' ? (
                  <FileCheck2 className="w-4 h-4 text-emerald-400 inline" />
                ) : (
                  <Clock className="w-4 h-4 text-slate-500 inline" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
