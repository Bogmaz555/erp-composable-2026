"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Shield, Loader2 } from 'lucide-react';
import JpkPanel from './JpkPanel';
import JpkKrPanel from './JpkKrPanel';
import KsefStatusPanel from './KsefStatusPanel';

export default function TaxPage() {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['tax-invoices'],
    queryFn: async () => {
      const res = await fetch('/api/tax-legal/invoices');
      if (!res.ok) throw new Error('Błąd pobierania faktur KSeF');
      return res.json();
    },
    refetchInterval: 10000,
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col gap-6">
      <header className="flex items-center justify-between bg-slate-900/60 border border-slate-700/50 p-6 rounded-2xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
            <Shield className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Tax & Legal — KSeF</h1>
            <p className="text-sm text-slate-400">Faktury ustrukturyzowane (sandbox) · ADR-004 izolacja compliance</p>
          </div>
        </div>
        <KsefStatusPanel />
      </header>

      <JpkPanel />

      <div className="mt-6">
        <JpkKrPanel />
      </div>

      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden mt-6">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-400" />
          <h2 className="font-bold text-white">Rejestr faktur KSeF</h2>
        </div>
        <table className="w-full text-sm text-slate-300">
          <thead className="text-[10px] uppercase text-slate-500 bg-slate-950/30">
            <tr>
              <th className="p-4 text-left">Projekt</th>
              <th className="p-4 text-left">Milestone</th>
              <th className="p-4 text-right">Kwota</th>
              <th className="p-4 text-left">Nr KSeF</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-right">Data</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin inline text-emerald-400" /></td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={6} className="p-12 text-center text-slate-500">
                Brak faktur. Faktury tworzą się automatycznie po osiągnięciu milestone (FAT/SAT) w module PM.
              </td></tr>
            ) : invoices.map((inv: any) => (
              <tr key={inv.id} className="border-t border-slate-800/50 hover:bg-slate-800/40">
                <td className="p-4 font-mono text-xs truncate max-w-[140px]">{inv.projectId}</td>
                <td className="p-4"><span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded border border-emerald-500/30">{inv.milestone}</span></td>
                <td className="p-4 text-right font-mono font-bold">{inv.amount?.toLocaleString('pl-PL')} {inv.currency}</td>
                <td className="p-4 font-mono text-xs text-slate-400">{inv.ksefReferenceNumber ?? '—'}</td>
                <td className="p-4">{inv.status}</td>
                <td className="p-4 text-right text-xs text-slate-500">
                  {inv.sentAt ? new Date(inv.sentAt).toLocaleString('pl-PL') : inv.createdAt ? new Date(inv.createdAt).toLocaleString('pl-PL') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
