"use client";

import React, { useEffect, useState } from 'react';
import { ShoppingCart, PackageOpen, LayoutGrid, RotateCcw, AlertTriangle, CheckCircle2, Copy, ThumbsUp, ThumbsDown } from 'lucide-react';
import ProcActions from './ProcActions';
import MrpPanel from './MrpPanel';
import LandedCostPanel from './LandedCostPanel';

interface PurchaseOrder {
  id: string;
  sku: string;
  amount: number;
  projectId?: string | null;
  bomComponentId?: string | null;
  source?: string;
  status: string;
  taskId?: string | null;
  createdAt?: string;
  /** legacy fields from older PO rows */
  materialType?: string;
  quantity?: number;
}

export default function ProcurementDashboard() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async (id?: string, decision?: string) => {
    setLoading(true);
    setError(null);
    try {
      if (id && decision) {
        // TWARDY OSTRZAŁ BEZPOŚREDNIO W PORT 4004 (Omijamy Bramę)
        const response = await fetch(`/api/proc/orders/${id}/${decision.toLowerCase()}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approvedBy: 'Procurement Director' })
        });

        if (!response.ok) {
          throw new Error('Failed to update order status');
        }
      }

      // TWARDY OSTRZAŁ BEZPOŚREDNIO W PORT 4004 (Omijamy Bramę)
      const response = await fetch('/api/proc/orders', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('No response from Procurement backend (Direct Route)');
      }

      const data = await response.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
      setError('System Backend Zamówień Zakupu nie odpowiada lub nie można pobrać danych. Spróbuj połącznia ponownie.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING_APPROVAL':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-amber-900/30 text-amber-300 border border-amber-800/50">
            <AlertTriangle className="w-3.5 h-3.5" />
            Do akceptacji
          </span>
        );
      case 'APPROVED':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-emerald-900/30 text-emerald-400 border border-emerald-800/50">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Zatwierdzone
          </span>
        );
      case 'REJECTED':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-rose-900/30 text-rose-400 border border-rose-800/50">
            Odrzucone
          </span>
        );
      case 'DRAFT':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-slate-800/80 text-slate-400 border border-slate-700">
            <LayoutGrid className="w-3.5 h-3.5" />
            Szkic (DRAFT)
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-emerald-900/30 text-emerald-400 border border-emerald-800/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Dostarczono (DELIVERED)
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-blue-900/30 text-blue-400 border border-blue-800/50">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex flex-col gap-8 relative overflow-hidden">

      {/* Background Glow Effects */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-emerald-900/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-blue-900/10 blur-[150px] rounded-full pointer-events-none" />

      {/* HEADER */}
      <header className="flex justify-between items-center bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 p-5 rounded-2xl shadow-xl z-10 relative shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-slate-800 p-3 rounded-xl shadow-inner border border-slate-700/50">
            <ShoppingCart className="w-7 h-7 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Centrum Zaopatrzenia (Procurement)
            </h1>
            <p className="text-sm text-slate-400 mt-1">Rejestr i obsługa zamówień Purchase Orders | Integracja Material Requirements</p>
          </div>
        </div>

        <button
          onClick={() => fetchOrders()}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl border border-slate-700 transition-all shadow-md active:scale-95 group disabled:opacity-50"
        >
          <RotateCcw className={`w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors ${loading ? 'animate-spin text-emerald-500' : ''}`} />
          Odśwież Rejestr
        </button>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 z-10 relative">
        <ProcActions onCreated={() => fetchOrders()} />
        <MrpPanel onRun={() => fetchOrders()} />
        <div className="mt-6">
          <LandedCostPanel />
        </div>
        {error ? (
          <div className="bg-rose-950/20 border border-rose-900/50 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px] text-center shadow-lg">
            <div className="bg-rose-900/30 p-4 rounded-full mb-4">
              <AlertTriangle className="w-10 h-10 text-rose-500" />
            </div>
            <h2 className="text-xl font-bold text-rose-200 mb-2">Brak komunikacji z usługą</h2>
            <p className="text-rose-400/80 max-w-lg mb-6">
              {error}
            </p>
            <button
              onClick={() => fetchOrders()}
              className="px-6 py-2 bg-rose-900/40 hover:bg-rose-900/60 text-rose-300 font-semibold rounded-lg border border-rose-800 transition-colors"
            >
              Ponów Próbę
            </button>
          </div>
        ) : (
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-5 border-b border-slate-800 bg-slate-900/40">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <PackageOpen className="w-4 h-4 text-emerald-500" />
                Wykaz Zakupów Systemowych (PO)
              </h2>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/50">
                    <th className="p-4 pl-6 font-semibold text-[11px] text-slate-500 uppercase tracking-widest border-b border-slate-800/80">ID Zamówienia</th>
                    <th className="p-4 font-semibold text-[11px] text-slate-500 uppercase tracking-widest border-b border-slate-800/80">Projekt Reference</th>
                    <th className="p-4 font-semibold text-[11px] text-slate-500 uppercase tracking-widest border-b border-slate-800/80">SKU</th>
                    <th className="p-4 font-semibold text-[11px] text-slate-500 uppercase tracking-widest border-b border-slate-800/80">Źródło</th>
                    <th className="p-4 font-semibold text-[11px] text-slate-500 uppercase tracking-widest border-b border-slate-800/80">BOM Component</th>
                    <th className="p-4 font-semibold text-[11px] text-slate-500 uppercase tracking-widest border-b border-slate-800/80 text-right">Ilość</th>
                    <th className="p-4 font-semibold text-[11px] text-slate-500 uppercase tracking-widest border-b border-slate-800/80 text-center">Status</th>
                    <th className="p-4 pr-6 font-semibold text-[11px] text-slate-500 uppercase tracking-widest border-b border-slate-800/80 text-center">Akcje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {loading ? (
                    // LOADING SKELETONS
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={`skeleton-${i}`} className="animate-pulse bg-slate-900/20">
                        <td className="p-4 pl-6"><div className="h-4 bg-slate-800 rounded w-48"></div></td>
                        <td className="p-4"><div className="h-4 bg-slate-800 rounded w-24"></div></td>
                        <td className="p-4"><div className="h-4 bg-slate-800 rounded w-32"></div></td>
                        <td className="p-4 flex justify-end"><div className="h-4 bg-slate-800 rounded w-12"></div></td>
                        <td className="p-4 pr-6 flex justify-center"><div className="h-6 bg-slate-800 rounded w-24"></div></td>
                      </tr>
                    ))
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-500 font-medium">
                        Brak aktywnych zamówień zakupowych (PO) w architekturze. Baza jest pusta.
                      </td>
                    </tr>
                  ) : (
                    orders.map((po) => {
                      const sku = po.sku || po.materialType || '—';
                      const qty = po.amount ?? po.quantity ?? 0;
                      const source = po.source || (po.materialType ? 'LEGACY' : 'MANUAL');
                      return (
                      <tr key={po.id} className="hover:bg-slate-800/40 transition-colors group">
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-2 font-mono text-sm text-slate-300">
                            {po.id.substring(0, 8)}...{po.id.substring(po.id.length - 6)}
                            <Copy className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 cursor-pointer hover:text-emerald-400 transition-all" />
                          </div>
                        </td>
                        <td className="p-4 font-medium text-slate-300">
                          {po.projectId || <span className="text-slate-600 italic">Nieokreślony</span>}
                        </td>
                        <td className="p-4 font-mono text-slate-300">{sku}</td>
                        <td className="p-4">
                          <span className={`text-xs font-semibold px-2 py-1 rounded border ${
                            source === 'MRP' ? 'bg-violet-900/30 text-violet-300 border-violet-800/50' :
                            source === 'SHORTAGE' ? 'bg-amber-900/30 text-amber-300 border-amber-800/50' :
                            'bg-slate-800/80 text-slate-400 border-slate-700'
                          }`}>
                            {source}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-xs text-slate-400 max-w-[140px] truncate" title={po.bomComponentId || undefined}>
                          {po.bomComponentId ? `${po.bomComponentId.slice(0, 8)}…` : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="p-4 text-right">
                          <span className="font-mono text-slate-200 bg-slate-950/50 px-2 py-1 rounded border border-slate-800 shadow-inner">
                            {qty} szt
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center">
                            {getStatusBadge(po.status)}
                          </div>
                        </td>
                        <td className="p-4 pr-6 text-center">
                          {po.status === 'PENDING_APPROVAL' ? (
                            <div className="flex justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => fetchOrders(po.id, 'approve')}
                                disabled={loading}
                                className="p-2 rounded-lg bg-emerald-900/40 border border-emerald-700/50 hover:bg-emerald-800/60 text-emerald-300 transition-colors"
                                title="Zatwierdź"
                              >
                                <ThumbsUp className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => fetchOrders(po.id, 'reject')}
                                disabled={loading}
                                className="p-2 rounded-lg bg-rose-900/40 border border-rose-700/50 hover:bg-rose-800/60 text-rose-300 transition-colors"
                                title="Odrzuć"
                              >
                                <ThumbsDown className="w-4 h-4" />
                              </button>
                            </div>
                          ) : po.status === 'APPROVED' ? (
                            <button
                              type="button"
                              onClick={async () => {
                                setLoading(true);
                                try {
                                  const res = await fetch(`/api/proc/orders/${po.id}/receive`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      quantity: qty,
                                      receivedBy: 'Warehouse',
                                      unitPrice: 100,
                                      freightCost: 250,
                                      customsDuty: 50,
                                    }),
                                  });
                                  if (!res.ok) throw new Error('receive failed');
                                  await fetchOrders();
                                } catch (e) {
                                  console.error(e);
                                  setError('Przyjęcie magazynowe nie powiodło się.');
                                } finally {
                                  setLoading(false);
                                }
                              }}
                              disabled={loading}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-900/40 border border-blue-700/50 text-blue-300 hover:bg-blue-800/50"
                            >
                              Przyjęcie MAG
                            </button>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );})
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

    </div>
  );
}
