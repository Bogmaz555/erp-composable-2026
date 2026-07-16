"use client";

import React from 'react';
import { MapPin, ClipboardList, Play } from 'lucide-react';
import { useWmsBins, useWmsPickLists, useCreatePickList, useConfirmPick } from '../../hooks/useINV';

export default function WmsPickingPanel() {
  const { data: bins = [] } = useWmsBins();
  const { data: picks = [], isLoading } = useWmsPickLists();
  const createPick = useCreatePickList();
  const confirmPick = useConfirmPick();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-300 mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Lokalizacje (Bins)
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {bins.map((b) => (
              <div key={b.id} className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg">
                <span className="font-mono text-cyan-400 text-sm">{b.code}</span>
                <p className="text-[10px] text-slate-500 uppercase">{b.zone}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-emerald-800/40 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> Kompletacja (Pick Lists)
            </h2>
            <button
              type="button"
              onClick={() => createPick.mutate({})}
              disabled={createPick.isPending}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg flex items-center gap-1"
            >
              <Play className="w-3.5 h-3.5" />
              Generuj z rezerwacji
            </button>
          </div>
          {isLoading && <p className="text-slate-500 text-sm">Ładowanie...</p>}
          {picks.length === 0 && !isLoading && (
            <p className="text-slate-500 text-sm">Brak list — wygeneruj z aktywnych rezerwacji INV.</p>
          )}
        </div>
      </div>

      {picks.map((pl) => (
        <div key={pl.id} className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-3">
            <span className="font-mono text-emerald-400 font-bold">{pl.pickNumber}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
              pl.status === 'COMPLETED' ? 'bg-emerald-900/40 text-emerald-300' :
              pl.status === 'IN_PROGRESS' ? 'bg-blue-900/40 text-blue-300' :
              'bg-slate-800 text-slate-400'
            }`}>{pl.status}</span>
          </div>
          <div className="space-y-2">
            {pl.lines.map((line) => (
              <div key={line.id} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm">
                <div>
                  <span className="font-mono text-white">{line.sku}</span>
                  <span className="text-slate-500 ml-2">× {line.quantity}</span>
                  {line.binCode && <span className="text-cyan-500 ml-2 text-xs">@{line.binCode}</span>}
                </div>
                {line.status === 'PENDING' ? (
                  <button
                    type="button"
                    onClick={() => confirmPick.mutate({ pickListId: pl.id, lineId: line.id, pickedQty: line.quantity })}
                    className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded"
                  >
                    Pobrano
                  </button>
                ) : (
                  <span className="text-emerald-400 text-xs font-bold">✓ {line.pickedQty}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
