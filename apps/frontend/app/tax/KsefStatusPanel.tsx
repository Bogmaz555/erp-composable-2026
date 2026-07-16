"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function KsefStatusPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['ksef-status'],
    queryFn: async () => {
      const res = await fetch('/api/tax-legal/ksef/status');
      if (!res.ok) throw new Error('Błąd statusu KSeF');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const isProd = data?.mode === 'production';
  const ready = data?.ready !== false;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
      isProd ? 'bg-violet-900/20 border-violet-700/40' : 'bg-emerald-900/20 border-emerald-700/40'
    }`}>
      <Shield className={`w-5 h-5 ${isProd ? 'text-violet-400' : 'text-emerald-400'}`} />
      <div>
        <div className="text-sm font-bold text-white">
          KSeF {isLoading ? '…' : isProd ? 'PRODUKCJA' : 'SANDBOX'}
        </div>
        <div className="text-[10px] text-slate-400">
          {isProd
            ? `API: ${data?.apiUrl} · Token: ${data?.token}`
            : `Adapter: ${data?.sandboxUrl ?? 'mock'}`}
        </div>
      </div>
      {ready ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-400 ml-auto" />
      ) : (
        <AlertTriangle className="w-5 h-5 text-amber-400 ml-auto" />
      )}
    </div>
  );
}
