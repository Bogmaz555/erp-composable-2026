'use client';

import { useState } from 'react';
import { usePLMEcos, useCreateEco } from '../../hooks/usePLM';
import BomEditor from './BomEditor';
import {
  PlusCircle, Loader2, GitMerge, GitCommit, AlertTriangle, Layers, Truck,
} from 'lucide-react';

export default function PLMDashboard() {
  const { data: ecos = [], isLoading: ecosLoading, error: ecosError } = usePLMEcos();
  const createEco = useCreateEco();
  const [activeTab, setActiveTab] = useState<'BOM' | 'ECO'>('BOM');

  const handleCreateECO = async () => {
    await createEco.mutateAsync({
      title: 'Update to Revision B',
      description: 'Fixing tolerance issues',
    });
  };

  return (
    <main className="flex-1 overflow-y-auto p-8 text-slate-300">
      <header className="mb-8 flex justify-between items-end border-b border-slate-800 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
            <Layers className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Centrum Inżynieryjne PLM</h1>
            <p className="text-slate-400 mt-1">Zarządzanie Cyklem Życia Produktu i Ofertowaniem ETO</p>
          </div>
        </div>
        {activeTab === 'ECO' && (
          <button onClick={handleCreateECO} disabled={createEco.isPending}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors border border-slate-600">
            {createEco.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <GitMerge className="w-5 h-5" />}
            Nowe ECO
          </button>
        )}
      </header>

      <div className="flex gap-6 mb-8">
        {(['BOM', 'ECO'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`pb-3 px-2 font-semibold transition-colors border-b-2 ${
              activeTab === tab ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab === 'BOM' ? 'Struktury Produktu (BOM)' : 'Zmiany Inżynieryjne (ECO)'}
          </button>
        ))}
      </div>

      {activeTab === 'BOM' && <BomEditor />}

      {activeTab === 'ECO' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {ecosError && (
            <div className="lg:col-span-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5" /> {(ecosError as Error).message}
            </div>
          )}
          <section className="bg-[#0A1428]/80 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl shadow-2xl">
            <div className="flex items-center gap-2 mb-6">
              <GitCommit className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-bold text-white">Rejestr ECO</h2>
            </div>
            {ecosLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
            ) : ecos.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-700 rounded-xl text-slate-500">
                Brak zmian inżynieryjnych.
              </div>
            ) : (
              <ul className="space-y-4">
                {ecos.map((eco: any) => (
                  <li key={eco.id} className="p-5 bg-slate-800/40 rounded-xl border border-slate-700">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-bold text-emerald-400 block mb-1">{eco.ecoNumber}</span>
                        <h3 className="font-bold text-white">{eco.title}</h3>
                      </div>
                      <span className="bg-slate-700 text-xs px-3 py-1 rounded-full text-slate-200">{eco.status}</span>
                    </div>
                    <p className="text-slate-400 text-sm">{eco.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
            <Truck className="w-12 h-12 text-amber-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Long-Lead Items</h3>
            <p className="text-slate-400 text-sm max-w-md">Wczesne zapotrzebowanie do PROC uruchamia się automatycznie po Release BOM z komponentami o długim lead time.</p>
          </section>
        </div>
      )}
    </main>
  );
}
