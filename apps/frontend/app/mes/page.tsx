"use client";

import { useState } from 'react';
import Link from 'next/link';
import {
  Factory, Play, CheckCircle, Clock, AlertCircle, FileText, Wrench,
  AlertTriangle, Pause, Gauge, ListOrdered,
} from 'lucide-react';
import {
  useMESWorkOrders, useMESOperations, useMSEOee,
  useMESStartWO, useMESFinishWO, useMESOpAction,
} from '../../hooks/useMES';

interface WorkOrder {
  id: string;
  orderNumber: string;
  productName: string;
  quantity: number;
  status: string;
}

const opStatusColor: Record<string, string> = {
  PENDING: 'bg-slate-700 text-slate-300',
  IN_PROGRESS: 'bg-blue-900/50 text-blue-300 border border-blue-700',
  COMPLETED: 'bg-emerald-900/50 text-emerald-300 border border-emerald-700',
};

export default function MESTerminal() {
  const { data: orders = [], isLoading } = useMESWorkOrders();
  const { data: oee } = useMSEOee();
  const startWO = useMESStartWO();
  const finishWO = useMESFinishWO();
  const opAction = useMESOpAction();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeOrder = orders.find((o: WorkOrder) => o.status === 'IN_PROGRESS') as WorkOrder | undefined;
  const focusId = selectedId || activeOrder?.id || null;
  const { data: operations = [] } = useMESOperations(focusId);

  const handleQualityAlert = () => alert('Zgłoszono problem jakościowy do działu QMS.');
  const handleShortage = () => alert('Zgłoszono brak materiałowy do działu Zakupów.');
  const handleDocs = () => alert('Pobieranie najnowszej rewizji rysunku z PLM...');

  const displayOrder = activeOrder || orders.find((o: WorkOrder) => o.id === focusId);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <Factory className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Kiosk Produkcyjny (Shopfloor)</h1>
            <p className="text-slate-400 mt-1">Terminal operatora MES — routingi, operacje, OEE</p>
          </div>
        </div>
        <div className="flex gap-4">
          <Link
            href="/mes/kiosk"
            className="px-5 py-3 bg-blue-700 hover:bg-blue-600 rounded-xl text-sm font-bold border border-blue-500/50"
          >
            📱 Tryb Kiosk
          </Link>
          {oee && (
            <div className="px-6 py-3 bg-emerald-900/30 border border-emerald-700/40 rounded-xl text-center">
              <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider flex items-center gap-1 justify-center">
                <Gauge className="w-3.5 h-3.5" /> OEE
              </p>
              <p className="text-2xl font-black text-emerald-300">{oee.oee}%</p>
              <p className="text-[10px] text-slate-500">A:{oee.availability}% P:{oee.performance}% Q:{oee.quality}%</p>
            </div>
          )}
          <div className="px-6 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-center">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Zmiana</p>
            <p className="text-lg font-bold text-white">Z-1 (Rano)</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0A1428]/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
            {displayOrder && (
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />
            )}

            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-400" /> Aktywne Zlecenie
            </h2>

            {displayOrder ? (
              <div className="space-y-6 relative z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-3 ${
                      displayOrder.status === 'IN_PROGRESS'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse'
                        : 'bg-slate-700 text-slate-300'
                    }`}>
                      {displayOrder.status}
                    </span>
                    <h3 className="text-3xl font-extrabold text-white tracking-tight mb-2">{displayOrder.productName}</h3>
                    <p className="text-lg text-slate-400 font-mono">Zlecenie: {displayOrder.orderNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400 uppercase font-semibold mb-1">Ilość</p>
                    <p className="text-4xl font-black text-white">{displayOrder.quantity}<span className="text-xl text-slate-500 ml-2">szt.</span></p>
                  </div>
                </div>

                {displayOrder.status === 'IN_PROGRESS' && (
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => finishWO.mutate(displayOrder.id)}
                      disabled={finishWO.isPending}
                      className="flex flex-col items-center justify-center gap-3 p-6 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-2xl transition-all group"
                    >
                      <CheckCircle className="w-12 h-12 text-emerald-400 group-hover:scale-110 transition-transform" />
                      <span className="text-lg font-bold text-emerald-300">Zamelduj Wykonanie</span>
                    </button>
                    <button className="flex flex-col items-center justify-center gap-3 p-6 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-2xl transition-all group">
                      <Pause className="w-12 h-12 text-amber-400 group-hover:scale-110 transition-transform" />
                      <span className="text-lg font-bold text-amber-300">Wstrzymaj Operację</span>
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-700/50">
                  <button onClick={handleDocs} className="flex items-center justify-center gap-2 p-4 bg-slate-800/50 hover:bg-slate-700 border border-slate-600 rounded-xl text-slate-300 font-medium">
                    <FileText className="w-5 h-5 text-blue-400" /> Rysunek PLM
                  </button>
                  <button onClick={handleShortage} className="flex items-center justify-center gap-2 p-4 bg-slate-800/50 hover:bg-slate-700 border border-slate-600 rounded-xl text-slate-300 font-medium">
                    <AlertCircle className="w-5 h-5 text-orange-400" /> Brak Części
                  </button>
                  <button onClick={handleQualityAlert} className="flex items-center justify-center gap-2 p-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-300 font-medium">
                    <AlertTriangle className="w-5 h-5" /> Alert Jakości
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center border-2 border-dashed border-slate-700 rounded-2xl">
                <Clock className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-400 mb-2">Brak Aktywnego Zlecenia</h3>
                <p className="text-slate-500">Wybierz zlecenie z kolejki, aby rozpocząć produkcję.</p>
              </div>
            )}
          </div>

          {focusId && operations.length > 0 && (
            <div className="bg-[#0A1428]/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <ListOrdered className="w-5 h-5 text-cyan-400" /> Routing operacji
              </h2>
              <div className="space-y-3">
                {operations.map((op) => (
                  <div key={op.id} className="flex items-center justify-between p-4 bg-slate-800/40 border border-slate-700 rounded-xl">
                    <div>
                      <span className="text-xs font-mono text-slate-500">#{op.sequence}</span>
                      <p className="font-bold text-slate-200">{op.name}</p>
                      {op.workCenter && <p className="text-xs text-slate-500">{op.workCenter} · {op.standardTimeMinutes ?? 0} min std</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded text-xs font-bold ${opStatusColor[op.status] || opStatusColor.PENDING}`}>
                        {op.status}
                      </span>
                      {op.status === 'PENDING' && (
                        <button
                          onClick={() => opAction.mutate({ id: op.id, action: 'start' })}
                          disabled={opAction.isPending}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg"
                        >
                          Start
                        </button>
                      )}
                      {op.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => opAction.mutate({ id: op.id, action: 'complete' })}
                          disabled={opAction.isPending}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg"
                        >
                          Zakończ
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-[#0A1428]/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl flex flex-col h-full">
          <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-700/50 pb-4">Kolejka Zadań</h2>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {isLoading && <div className="text-center py-8 text-slate-500">Ładowanie...</div>}
            {!isLoading && orders.filter((o: WorkOrder) => o.status === 'PENDING').length === 0 && (
              <div className="text-center py-8 text-slate-500">Brak oczekujących zleceń.</div>
            )}
            {orders.filter((o: WorkOrder) => o.status === 'PENDING').map((order: WorkOrder) => (
              <div
                key={order.id}
                className={`p-5 border rounded-xl transition-colors ${
                  focusId === order.id ? 'bg-blue-900/20 border-blue-600' : 'bg-slate-800/40 hover:bg-slate-800 border-slate-700'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-mono text-blue-400">{order.orderNumber}</span>
                  <span className="px-2.5 py-0.5 bg-slate-700 rounded text-xs font-medium text-slate-300">{order.quantity} szt.</span>
                </div>
                <h4 className="font-bold text-slate-200 mb-4">{order.productName}</h4>
                <button
                  onClick={() => {
                    setSelectedId(order.id);
                    startWO.mutate(order.id);
                  }}
                  disabled={activeOrder !== undefined || startWO.isPending}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-lg transition-colors"
                >
                  <Play className="w-4 h-4" /> Rozpocznij
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
