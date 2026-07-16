"use client";

import React, { useState } from 'react';
import { useINVInventory, useINVCreateItem, useINVAdjustStock, useINVLots, useINVCreateLot } from '../../hooks/useINV';
import GenealogyPanel from './GenealogyPanel';
import WmsPickingPanel from './WmsPickingPanel';
import {
  Package, Plus, AlertTriangle, TrendingUp, RefreshCw, Box, Database, GitBranch, Tags, MapPin,
} from 'lucide-react';

type InvTab = 'stock' | 'lots' | 'genealogy' | 'wms';

export default function InventoryDashboard() {
  const [tab, setTab] = useState<InvTab>('stock');
  const { data: inventory = [], isLoading, isError, error } = useINVInventory();
  const { data: lots = [], isLoading: lotsLoading } = useINVLots();
  const createItem = useINVCreateItem();
  const adjustStock = useINVAdjustStock();
  const createLot = useINVCreateLot();

  const [lotItemId, setLotItemId] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [lotQty, setLotQty] = useState('1');

  // Osobne stany formularza dla kreacji przedmiotu
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'RAW_MATERIAL' | 'COMPONENT' | 'FINISHED_GOOD'>('RAW_MATERIAL');
  const [unit, setUnit] = useState('szt');
  const [createError, setCreateError] = useState<string | null>(null);

  // Stan poszczególnych inputów ilości by item.id
  const [adjustments, setAdjustments] = useState<Record<string, string>>({});

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim() || !name.trim() || !unit.trim()) return;
    setCreateError(null);
    try {
      await createItem.mutateAsync({ sku, name, type, unit });
      setSku('');
      setName('');
      setUnit('szt');
    } catch (err: any) {
      setCreateError(err.message || 'Wystąpił błąd serwera NATS / Gateway');
    }
  };

  const handleAdjustSubmit = async (itemId: string, adjustmentVal: string) => {
    const qty = parseFloat(adjustmentVal);
    if (isNaN(qty) || qty === 0) return;
    try {
      await adjustStock.mutateAsync({ itemId, quantity: qty });
      setAdjustments(prev => ({ ...prev, [itemId]: '' }));
    } catch (error) {
      console.error(error);
      alert('Nie udało się zapisać korekty magazynowej');
    }
  };

  const getItemTypeBadge = (t: string) => {
    switch (t) {
      case 'RAW_MATERIAL':
        return <span className="px-2 py-0.5 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/30 rounded font-bold">SUROWIEC</span>;
      case 'COMPONENT':
        return <span className="px-2 py-0.5 text-xs text-blue-500 bg-blue-500/10 border border-blue-500/30 rounded font-bold">KOMPONENT</span>;
      case 'FINISHED_GOOD':
        return <span className="px-2 py-0.5 text-xs text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 rounded font-bold">PRODUKT</span>;
      default:
        return <span className="px-2 py-0.5 text-xs text-slate-500 bg-slate-500/10 border border-slate-500/30 rounded font-bold">{t}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden text-slate-400 font-mono">
        <Database className="w-10 h-10 animate-pulse text-blue-500/50 mb-3" />
        Autoryzacja Gateway i zestawianie węzłów mikroserwisów INV...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center p-6 text-slate-400">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Bramka API: Błąd 500</h2>
        <p className="max-w-md">{error instanceof Error ? error.message : 'Zewnętrzny system operacyjny odrzucił połączenie'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col gap-6 relative overflow-hidden">
      {/* Decorative Blob */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* HEADER */}
      <header className="flex justify-between items-center bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl shadow-xl z-10 shrink-0 relative">
        <div className="flex gap-4 items-center">
          <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/30 shadow-inner">
            <Package className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white focus:outline-none">Centralny Magazyn ETO</h1>
            <p className="text-sm text-slate-400 font-medium">Architektura modułowa: kontrola poziomu asortymentu w czasie rzeczywistym</p>
          </div>
        </div>

        <div className="flex items-center gap-2 border border-slate-700/50 bg-slate-800/40 p-1.5 rounded-lg text-slate-300 font-mono text-xs w-48 shadow-inner shadow-black/30">
          <Database className="w-3.5 h-3.5 text-emerald-500 ml-1" />
          <span className="flex-1 truncate uppercase px-1">DB PUSH LIVE ({inventory.length} REK)</span>
        </div>
      </header>

      <div className="flex gap-2 z-10 bg-slate-900/60 p-1 rounded-xl border border-slate-700/50 w-max">
        {([
          { id: 'stock' as InvTab, label: 'Stany magazynowe', icon: Box },
          { id: 'lots' as InvTab, label: 'Partie / SN', icon: Tags },
          { id: 'genealogy' as InvTab, label: 'Genealogia', icon: GitBranch },
          { id: 'wms' as InvTab, label: 'WMS / Picking', icon: MapPin },
        ]).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors ${
              tab === id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'genealogy' && <GenealogyPanel />}
      {tab === 'wms' && <WmsPickingPanel />}

      {tab === 'lots' && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 z-10">
          <div className="bg-slate-900/60 border border-slate-700/50 p-6 rounded-2xl h-min">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" /> Przyjęcie partii / SN
            </h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!lotItemId || !lotNumber) return;
              await createLot.mutateAsync({
                itemId: lotItemId,
                lotNumber,
                serialNumber: serialNumber || undefined,
                quantity: parseInt(lotQty, 10) || 1,
              });
              setLotNumber(''); setSerialNumber(''); setLotQty('1');
            }} className="space-y-3">
              <select value={lotItemId} onChange={(e) => setLotItemId(e.target.value)} required
                className="w-full bg-slate-950/60 border border-slate-800 p-2.5 rounded-lg text-sm text-slate-200">
                <option value="">— wybierz pozycję —</option>
                {inventory.map((i) => <option key={i.id} value={i.id}>{i.sku} — {i.name}</option>)}
              </select>
              <input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} required placeholder="Nr partii LOT-..."
                className="w-full bg-slate-950/60 border border-slate-800 p-2.5 rounded-lg text-sm text-slate-200" />
              <input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="Nr seryjny (opcjonalnie)"
                className="w-full bg-slate-950/60 border border-slate-800 p-2.5 rounded-lg text-sm text-slate-200" />
              <input type="number" min="1" value={lotQty} onChange={(e) => setLotQty(e.target.value)} placeholder="Ilość"
                className="w-full bg-slate-950/60 border border-slate-800 p-2.5 rounded-lg text-sm text-slate-200" />
              <button type="submit" disabled={createLot.isPending}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg font-bold disabled:opacity-50">
                Zarejestruj PZ partii
              </button>
            </form>
          </div>
          <div className="lg:col-span-2 bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
            <table className="w-full text-sm text-slate-300">
              <thead className="text-[10px] uppercase text-slate-500 bg-slate-950/30 border-b border-slate-800">
                <tr>
                  <th className="p-4">SKU</th><th className="p-4">Partia</th><th className="p-4">SN</th>
                  <th className="p-4 text-right">Ilość</th><th className="p-4">Lokalizacja</th>
                </tr>
              </thead>
              <tbody>
                {lotsLoading ? (
                  <tr><td colSpan={5} className="p-8 text-center"><RefreshCw className="w-5 h-5 animate-spin inline" /></td></tr>
                ) : lots.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-500">Brak zarejestrowanych partii.</td></tr>
                ) : lots.map((l) => (
                  <tr key={l.id} className="border-b border-slate-800/40 hover:bg-slate-800/40">
                    <td className="p-4 font-mono text-xs">{l.item?.sku}</td>
                    <td className="p-4 font-mono">{l.lotNumber}</td>
                    <td className="p-4 font-mono text-slate-400">{l.serialNumber ?? '—'}</td>
                    <td className="p-4 text-right font-mono">{l.quantity}</td>
                    <td className="p-4 text-slate-500">{l.location ?? 'MAIN'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'stock' && (
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 z-10">

        {/* ADD ITEM FORM */}
        <div className="col-span-1 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl shadow-lg flex flex-col gap-5 h-min">
          <h2 className="text-[14px] font-bold tracking-widest uppercase text-slate-300 flex items-center gap-2 border-b border-slate-800/80 pb-3">
            <Plus className="w-4 h-4 text-emerald-400" /> Dodaj Asortyment
          </h2>

          <form onSubmit={handleCreateSubmit} className="flex flex-col gap-3.5 w-full">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-widest text-slate-400 uppercase ml-0.5">SKU</label>
              <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} required placeholder="M-00129"
                className="bg-slate-950/60 border border-slate-800 focus:border-blue-500/70 p-2.5 rounded-lg text-sm text-slate-200 outline-none transition-colors shadow-inner" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-widest text-slate-400 uppercase ml-0.5">Nazwa produktu / surowca</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Silnik Osi X V2"
                className="bg-slate-950/60 border border-slate-800 focus:border-blue-500/70 p-2.5 rounded-lg text-sm text-slate-200 outline-none transition-colors shadow-inner" />
            </div>

            <div className="flex gap-3 w-full">
              <div className="flex flex-col gap-1.5 w-2/3">
                <label className="text-[10px] font-bold tracking-widest text-slate-400 uppercase ml-0.5">Typ</label>
                <select value={type} onChange={(e: any) => setType(e.target.value)}
                  className="bg-slate-950/60 border border-slate-800 focus:border-blue-500/70 p-2.5 rounded-lg text-sm text-slate-200 outline-none transition-colors shrink-0 shadow-inner appearance-none cursor-pointer">
                  <option value="RAW_MATERIAL">SUROWIEC</option>
                  <option value="COMPONENT">KOMPONENT</option>
                  <option value="FINISHED_GOOD">WYRÓB GOTOWY</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5 w-1/3">
                <label className="text-[10px] font-bold tracking-widest text-slate-400 uppercase ml-0.5">J.M.</label>
                <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} required placeholder="szt"
                  className="bg-slate-950/60 border border-slate-800 focus:border-blue-500/70 p-2.5 rounded-lg text-sm text-slate-200 outline-none transition-colors shadow-inner" />
              </div>
            </div>

            {createError && (
              <div className="mt-2 text-xs text-rose-400 bg-rose-900/10 p-2 rounded border border-rose-800/30 flex items-start gap-1">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {createError}
              </div>
            )}

            <button type="submit" disabled={createItem.isPending}
              className="mt-4 bg-blue-600/90 hover:bg-blue-500 disabled:opacity-50 text-white p-3 rounded-lg font-bold shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all flex justify-center items-center gap-2 outline-none focus:ring-2 focus:ring-blue-400">
              {createItem.isPending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              Rejestruj Model
            </button>
          </form>
        </div>

        {/* INVENTORY TABLE */}
        <div className="col-span-1 lg:col-span-3 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-xl flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-800/80 flex items-center justify-between shrink-0">
            <h2 className="text-[14px] font-bold tracking-widest uppercase text-slate-300 flex items-center gap-2">
              <Box className="w-4 h-4 text-blue-400" /> Tabela Asortymentu INV
            </h2>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-[10px] uppercase text-slate-500 bg-slate-950/30 border-b border-slate-800">
                <tr>
                  <th className="p-4 font-bold tracking-wider">Identyfikator (SKU)</th>
                  <th className="p-4 font-bold tracking-wider">Nazwa Towaru</th>
                  <th className="p-4 font-bold tracking-wider">Typ</th>
                  <th className="p-4 font-bold tracking-wider text-right">Stan (Qty) / J.m.</th>
                  <th className="p-4 font-bold tracking-wider text-right">Zarządzanie Zapasami (PZ/WZ)</th>
                </tr>
              </thead>
              <tbody>
                {inventory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500">
                      Baza danych asortymentu jest pusta. Dodaj wpis z menu bocznego, aby zainicjować.
                    </td>
                  </tr>
                ) : (
                  inventory.map((item) => {
                    const currentStock = item.stockLevels[0]?.quantity || 0;
                    const cValue = adjustments[item.id] || '';

                    return (
                      <tr key={item.id} className="border-b border-slate-800/40 hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-mono text-slate-400">{item.sku}</td>
                        <td className="p-4 font-bold text-slate-200">{item.name}</td>
                        <td className="p-4">{getItemTypeBadge(item.type)}</td>
                        <td className="p-4 text-right">
                          <span className={`font-mono text-base font-bold ${currentStock > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {currentStock}
                          </span>
                          <span className="text-xs text-slate-500 ml-1.5">{item.unit}</span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end items-center gap-2">
                            <input
                              type="number"
                              placeholder="+-"
                              value={cValue}
                              onChange={(e) => setAdjustments({ ...adjustments, [item.id]: e.target.value })}
                              className="w-16 bg-slate-950/60 border border-slate-700 focus:border-blue-500 rounded p-1.5 text-center font-mono text-sm outline-none transition-colors shadow-inner"
                            />
                            <button
                              disabled={adjustStock.isPending && adjustStock.variables?.itemId === item.id || cValue === ''}
                              onClick={() => handleAdjustSubmit(item.id, cValue)}
                              className="bg-slate-800 hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 hover:text-white p-1.5 rounded outline-none transition-colors border border-slate-700 hover:border-emerald-500"
                            >
                              <TrendingUp className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
      )}
    </div>
  );
}
