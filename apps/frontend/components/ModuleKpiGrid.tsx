"use client";

import React from 'react';
import { useKpiDashboard } from '../hooks/usePlatform';
import { FileText, Factory, Package, Wallet, Activity, Zap } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(n);

export default function ModuleKpiGrid() {
  const { data, isLoading } = useKpiDashboard();
  const m = data?.modules;

  if (isLoading || !m) return null;

  const cards = [
    { label: 'Projekty ETO', val: String(m.pm.activeProjects), sub: `${m.pm.redZone} w strefie RED`, icon: FileText, color: 'text-blue-400' },
    { label: 'OEE Produkcja', val: `${m.mes.oee}%`, sub: `${m.mes.inProgress} WO w toku`, icon: Factory, color: 'text-cyan-400' },
    { label: 'Magazyn SKU', val: String(m.inv.skuCount), sub: `${m.inv.lowStock} niski stan`, icon: Package, color: 'text-emerald-400' },
    { label: 'Należności', val: fmt(m.fin.receivablesTotal), sub: `Zob. ${fmt(m.fin.payablesTotal)}`, icon: Wallet, color: 'text-violet-400' },
    { label: 'Otwarte NCR', val: String(m.quality.openNcrs), sub: 'Quality', icon: Activity, color: 'text-rose-400' },
    { label: 'NATS Events', val: m.platform.totalEvents.toLocaleString(), sub: `${m.platform.mps} msg/s`, icon: Zap, color: 'text-amber-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {cards.map((c) => (
        <div key={c.label} className="glass-panel p-4 rounded-xl border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <c.icon className={`w-4 h-4 ${c.color}`} />
            <span className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">{c.label}</span>
          </div>
          <p className="text-xl font-bold text-white">{c.val}</p>
          <p className="text-[10px] text-gray-500 mt-1">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}
