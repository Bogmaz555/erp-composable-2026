"use client";

import React, { useState } from 'react';
import { Plus, Building2 } from 'lucide-react';
import { usePROCSuppliers, useCreateSupplier, useCreatePO } from '../../hooks/usePROC';
import { Field, TextInput } from '../../components/ui/Field';

export default function ProcActions({ onCreated }: { onCreated?: () => void }) {
  const { data: suppliers = [] } = usePROCSuppliers();
  const createSupplier = useCreateSupplier();
  const createPO = useCreatePO();

  const [sku, setSku] = useState('');
  const [amount, setAmount] = useState('1');
  const [supplierId, setSupplierId] = useState('');
  const [supCode, setSupCode] = useState('');
  const [supName, setSupName] = useState('');
  const [showSupplier, setShowSupplier] = useState(false);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-emerald-400" /> Nowe zamówienie (PO)
        </h3>
        <form onSubmit={async (e) => {
          e.preventDefault();
          await createPO.mutateAsync({ sku, amount: parseInt(amount, 10) || 1, supplierId: supplierId || undefined });
          setSku(''); setAmount('1'); onCreated?.();
        }} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[120px]">
            <Field label="SKU / indeks"><TextInput value={sku} onChange={(e) => setSku(e.target.value)} required placeholder="M-001" /></Field>
          </div>
          <div className="w-24">
            <Field label="Ilość"><TextInput type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          </div>
          <div className="flex-1 min-w-[140px]">
            <Field label="Dostawca">
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 p-2.5 rounded-lg text-sm text-slate-200">
                <option value="">— opcjonalnie —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
              </select>
            </Field>
          </div>
          <button type="submit" disabled={createPO.isPending}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-sm disabled:opacity-50">
            Utwórz PO
          </button>
        </form>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
        <button onClick={() => setShowSupplier(!showSupplier)}
          className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2 w-full text-left">
          <Building2 className="w-4 h-4 text-blue-400" /> Kartoteka dostawców {showSupplier ? '▾' : '▸'}
        </button>
        {showSupplier && (
          <form onSubmit={async (e) => {
            e.preventDefault();
            await createSupplier.mutateAsync({ code: supCode, name: supName });
            setSupCode(''); setSupName('');
          }} className="flex flex-wrap gap-3 items-end">
            <Field label="Kod"><TextInput value={supCode} onChange={(e) => setSupCode(e.target.value)} required placeholder="SUP-01" /></Field>
            <Field label="Nazwa"><TextInput value={supName} onChange={(e) => setSupName(e.target.value)} required placeholder="Firma Sp. z o.o." /></Field>
            <button type="submit" className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm">Dodaj</button>
          </form>
        )}
        {!showSupplier && suppliers.length > 0 && (
          <p className="text-xs text-slate-500">{suppliers.length} aktywnych dostawców w systemie</p>
        )}
      </div>
    </div>
  );
}
