"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Ship, Loader2 } from 'lucide-react';

interface LandedOrder {
  id: string;
  sku: string;
  amount: number;
  receivedQty?: number;
  unitPrice?: number;
  freightCost?: number;
  customsDuty?: number;
  landedUnitCost?: number;
  supplier?: { name: string };
}

export default function LandedCostPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['proc-landed-cost'],
    queryFn: async () => {
      const res = await fetch('/api/proc/orders/landed-cost');
      if (!res.ok) throw new Error('Błąd landed cost');
      return res.json() as Promise<{ count: number; totalLandedValue: number; orders: LandedOrder[] }>;
    },
    refetchInterval: 15000,
  });

  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ship className="w-5 h-5 text-orange-400" />
          <h2 className="font-bold text-white">Landed Cost — koszt w pełni obciążony</h2>
        </div>
        {data && (
          <span className="text-xs text-orange-300 font-mono">
            Σ {data.totalLandedValue.toLocaleString('pl-PL')} PLN · {data.count} PO
          </span>
        )}
      </div>
      {isLoading ? (
        <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
      ) : (
        <table className="w-full text-sm text-slate-300">
          <thead className="text-[10px] uppercase text-slate-500 bg-slate-950/30">
            <tr>
              <th className="p-4 text-left">SKU</th>
              <th className="p-4 text-left">Dostawca</th>
              <th className="p-4 text-right">Cena j.</th>
              <th className="p-4 text-right">Fracht</th>
              <th className="p-4 text-right">Cło</th>
              <th className="p-4 text-right font-bold text-orange-300">Landed/j.</th>
            </tr>
          </thead>
          <tbody>
            {(data?.orders ?? []).length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-500">Brak przyjęć z landed cost — zatwierdź PO i przyjmij z kosztami</td></tr>
            ) : (
              data?.orders.map((o) => (
                <tr key={o.id} className="border-t border-slate-800/50">
                  <td className="p-4 font-mono text-white">{o.sku}</td>
                  <td className="p-4">{o.supplier?.name ?? '—'}</td>
                  <td className="p-4 text-right">{o.unitPrice?.toFixed(2) ?? '—'}</td>
                  <td className="p-4 text-right">{o.freightCost?.toFixed(2) ?? '0'}</td>
                  <td className="p-4 text-right">{o.customsDuty?.toFixed(2) ?? '0'}</td>
                  <td className="p-4 text-right font-bold text-orange-300">{o.landedUnitCost?.toFixed(4)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
