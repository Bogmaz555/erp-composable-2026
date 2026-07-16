"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Factory, Play, Square, CheckCircle, ArrowLeft, Gauge } from 'lucide-react';
import {
  useMESWorkOrders, useMESOperations,
  useMESStartWO, useMESFinishWO, useMESOpAction, useMSEOee,
} from '../../../hooks/useMES';

export default function MESKioskPage() {
  const { data: orders = [] } = useMESWorkOrders();
  const { data: oee } = useMSEOee();
  const startWO = useMESStartWO();
  const finishWO = useMESFinishWO();
  const opAction = useMESOpAction();
  const [focusId, setFocusId] = useState<string | null>(null);
  const activeId = focusId ?? orders.find((o: { status: string }) => o.status === 'IN_PROGRESS')?.id ?? orders[0]?.id;
  const { data: operations = [] } = useMESOperations(activeId);

  const order = orders.find((o: { id: string }) => o.id === activeId);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col touch-manipulation">
      <header className="flex items-center justify-between p-4 bg-blue-950/80 border-b border-blue-800">
        <Link href="/mes" className="p-3 rounded-xl bg-slate-800/80">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div className="text-center">
          <h1 className="text-xl font-extrabold flex items-center justify-center gap-2">
            <Factory className="w-7 h-7 text-blue-400" /> MES Kiosk
          </h1>
          {oee && (
            <p className="text-xs text-blue-300/80 flex items-center justify-center gap-1 mt-1">
              <Gauge className="w-3 h-3" /> OEE {Math.round((oee.oee ?? 0) * 100)}%
            </p>
          )}
        </div>
        <div className="w-12" />
      </header>

      <div className="flex-1 p-4 flex flex-col gap-4 max-w-lg mx-auto w-full">
        <div className="grid grid-cols-2 gap-2">
          {orders.slice(0, 4).map((o: { id: string; orderNumber: string; status: string }) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setFocusId(o.id)}
              className={`p-4 rounded-2xl border-2 text-left min-h-[80px] ${
                o.id === activeId ? 'border-blue-500 bg-blue-900/40' : 'border-slate-700 bg-slate-900'
              }`}
            >
              <div className="font-bold text-lg">{o.orderNumber}</div>
              <div className="text-xs text-slate-400">{o.status}</div>
            </button>
          ))}
        </div>

        {order && (
          <div className="bg-slate-900 rounded-2xl p-5 border border-slate-700">
            <h2 className="text-2xl font-extrabold mb-1">{(order as { productName?: string }).productName ?? 'Zlecenie'}</h2>
            <p className="text-slate-400 text-sm mb-4">{(order as { orderNumber: string }).orderNumber}</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => startWO.mutate(activeId!)}
                disabled={startWO.isPending}
                className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl bg-emerald-700 hover:bg-emerald-600 active:scale-95 transition-transform min-h-[100px]"
              >
                <Play className="w-10 h-10" />
                <span className="font-bold text-lg">START</span>
              </button>
              <button
                type="button"
                onClick={() => finishWO.mutate(activeId!)}
                disabled={finishWO.isPending}
                className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl bg-rose-800 hover:bg-rose-700 active:scale-95 transition-transform min-h-[100px]"
              >
                <Square className="w-10 h-10" />
                <span className="font-bold text-lg">KONIEC</span>
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {operations.map((op: { id: string; name: string; status: string }) => (
            <button
              key={op.id}
              type="button"
              onClick={() => opAction.mutate({ id: op.id, action: op.status === 'IN_PROGRESS' ? 'complete' : 'start' })}
              className="w-full flex items-center justify-between p-5 rounded-2xl bg-slate-800 border border-slate-600 active:scale-[0.98] min-h-[72px]"
            >
              <span className="font-semibold text-lg">{op.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">{op.status}</span>
                {op.status === 'COMPLETED' && <CheckCircle className="w-6 h-6 text-emerald-400" />}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
