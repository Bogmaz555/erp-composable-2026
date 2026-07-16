"use client";

import React, { useMemo, useState } from 'react';
import {
  Boxes, Plus, Search, RefreshCw, AlertTriangle, Pencil, Power, PackageCheck, Tag, Database,
} from 'lucide-react';
import {
  useProducts, useProductStats, useCreateProduct, useUpdateProduct, useSetProductActive, Product,
} from '../../hooks/useProducts';
import { Modal } from '../../components/ui/Modal';
import { Field, TextInput, Select, TextArea } from '../../components/ui/Field';

const TYPE_OPTIONS = ['PART', 'ASSEMBLY', 'MACHINE', 'TOOL', 'CONSUMABLE', 'SERVICE'];
const LIFECYCLE_OPTIONS = ['DRAFT', 'ACTIVE', 'OBSOLETE'];
const MAKEBUY_OPTIONS = ['MAKE', 'BUY', 'PHANTOM'];

const TYPE_LABEL: Record<string, string> = {
  PART: 'Część', ASSEMBLY: 'Zespół', MACHINE: 'Maszyna', TOOL: 'Narzędzie', CONSUMABLE: 'Materiał', SERVICE: 'Usługa',
};

const emptyForm: Partial<Product> = {
  partNumber: '', name: '', description: '', type: 'PART', unitOfMeasure: 'szt',
  category: '', material: '', makeBuy: 'BUY', lifecycleStatus: 'ACTIVE', currency: 'PLN',
};

function lifecycleBadge(s: string) {
  const map: Record<string, string> = {
    ACTIVE: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    DRAFT: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    OBSOLETE: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
  };
  return <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${map[s] ?? map.OBSOLETE}`}>{s}</span>;
}

export default function ProductMasterPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const filters = useMemo(() => ({ search, type, status, page, pageSize: 25 }), [search, type, status, page]);
  const { data, isLoading, isError, error, isFetching, refetch } = useProducts(filters);
  const { data: stats } = useProductStats();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const setActive = useSetProductActive();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Partial<Product>>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setFormError(null); setModalOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); setForm({ ...p }); setFormError(null); setModalOpen(true); };

  const set = (k: keyof Product, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.partNumber?.trim() || !form.name?.trim()) {
      setFormError('Indeks i nazwa są wymagane');
      return;
    }
    try {
      if (editing) {
        await updateProduct.mutateAsync({ id: editing.id, ...form });
      } else {
        await createProduct.mutateAsync(form);
      }
      setModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Błąd zapisu');
    }
  };

  const rows = data?.rows ?? [];
  const saving = createProduct.isPending || updateProduct.isPending;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col gap-6 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* HEADER */}
      <header className="flex flex-wrap gap-4 justify-between items-center bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl shadow-xl z-10">
        <div className="flex gap-4 items-center">
          <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/30">
            <Boxes className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">Kartoteka Produktów</h1>
            <p className="text-sm text-slate-400 font-medium">Centralne dane podstawowe (Product Master) — źródło prawdy PLM</p>
          </div>
        </div>
        <button onClick={openCreate}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(99,102,241,0.25)] transition-all">
          <Plus className="w-5 h-5" /> Nowa pozycja
        </button>
      </header>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 z-10">
        <StatCard icon={<Database className="w-5 h-5 text-indigo-400" />} label="Pozycji łącznie" value={stats?.total ?? '—'} />
        <StatCard icon={<PackageCheck className="w-5 h-5 text-emerald-400" />} label="Aktywne" value={stats?.active ?? '—'} />
        <StatCard icon={<Power className="w-5 h-5 text-slate-400" />} label="Nieaktywne" value={stats?.inactive ?? '—'} />
        <StatCard icon={<Tag className="w-5 h-5 text-blue-400" />} label="Typów" value={stats?.byType?.length ?? '—'} />
      </div>

      {/* FILTER BAR */}
      <div className="flex flex-wrap gap-3 items-center bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-4 rounded-2xl z-10">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Szukaj: indeks, nazwa, opis..."
            className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500/70 pl-9 pr-3 py-2.5 rounded-lg text-sm text-slate-200 outline-none" />
        </div>
        <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}
          className="bg-slate-950/60 border border-slate-800 focus:border-indigo-500/70 px-3 py-2.5 rounded-lg text-sm text-slate-200 outline-none cursor-pointer">
          <option value="">Wszystkie typy</option>
          {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="bg-slate-950/60 border border-slate-800 focus:border-indigo-500/70 px-3 py-2.5 rounded-lg text-sm text-slate-200 outline-none cursor-pointer">
          <option value="">Każdy status</option>
          {LIFECYCLE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => refetch()} className="p-2.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors">
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* TABLE */}
      <div className="flex-1 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-xl flex flex-col overflow-hidden z-10">
        {isError ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <AlertTriangle className="w-10 h-10 text-rose-500" />
            {error instanceof Error ? error.message : 'Błąd pobierania danych'}
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-[10px] uppercase text-slate-500 bg-slate-950/30 border-b border-slate-800">
                <tr>
                  <th className="p-4 font-bold tracking-wider">Indeks</th>
                  <th className="p-4 font-bold tracking-wider">Nazwa</th>
                  <th className="p-4 font-bold tracking-wider">Typ</th>
                  <th className="p-4 font-bold tracking-wider">J.m.</th>
                  <th className="p-4 font-bold tracking-wider">M/B</th>
                  <th className="p-4 font-bold tracking-wider text-right">Lead (dni)</th>
                  <th className="p-4 font-bold tracking-wider text-right">Koszt std</th>
                  <th className="p-4 font-bold tracking-wider">Status</th>
                  <th className="p-4 font-bold tracking-wider text-right">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={9} className="p-12 text-center text-slate-500"><RefreshCw className="w-6 h-6 animate-spin inline" /> Ładowanie kartoteki...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={9} className="p-12 text-center text-slate-500">Brak pozycji. Dodaj pierwszą pozycję przyciskiem „Nowa pozycja".</td></tr>
                ) : rows.map((p) => (
                  <tr key={p.id} className={`border-b border-slate-800/40 hover:bg-slate-800/40 transition-colors ${!p.isActive ? 'opacity-50' : ''}`}>
                    <td className="p-4 font-mono text-slate-400">{p.partNumber}</td>
                    <td className="p-4 font-bold text-slate-200">{p.name}</td>
                    <td className="p-4"><span className="px-2 py-0.5 text-[10px] font-bold rounded border text-blue-400 bg-blue-500/10 border-blue-500/30">{TYPE_LABEL[p.type] ?? p.type}</span></td>
                    <td className="p-4 text-slate-400">{p.unitOfMeasure}</td>
                    <td className="p-4 text-slate-400 font-mono text-xs">{p.makeBuy}</td>
                    <td className="p-4 text-right font-mono">{p.leadTimeDays ?? '—'}</td>
                    <td className="p-4 text-right font-mono">{p.standardCost != null ? `${p.standardCost.toFixed(2)} ${p.currency}` : '—'}</td>
                    <td className="p-4">{lifecycleBadge(p.lifecycleStatus)}</td>
                    <td className="p-4">
                      <div className="flex justify-end items-center gap-2">
                        <button onClick={() => openEdit(p)} title="Edytuj"
                          className="p-1.5 rounded border border-slate-700 hover:border-indigo-500 hover:bg-indigo-600 hover:text-white text-slate-300 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setActive.mutate({ id: p.id, active: !p.isActive })} title={p.isActive ? 'Dezaktywuj' : 'Aktywuj'}
                          className={`p-1.5 rounded border transition-colors ${p.isActive ? 'border-slate-700 hover:border-rose-500 hover:bg-rose-600 hover:text-white text-slate-300' : 'border-emerald-700 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white'}`}>
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        {data && data.pageCount > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 text-sm text-slate-400">
            <span>Strona {data.page} z {data.pageCount} · {data.total} pozycji</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded border border-slate-700 hover:bg-slate-800 disabled:opacity-40">Poprzednia</button>
              <button disabled={page >= data.pageCount} onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded border border-slate-700 hover:bg-slate-800 disabled:opacity-40">Następna</button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      <Modal
        open={modalOpen}
        title={editing ? `Edycja: ${editing.partNumber}` : 'Nowa pozycja kartoteki'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="px-4 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800">Anuluj</button>
            <button onClick={submit} disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold flex items-center gap-2">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {editing ? 'Zapisz zmiany' : 'Utwórz'}
            </button>
          </>
        }
      >
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Indeks (partNumber)">
            <TextInput value={form.partNumber ?? ''} onChange={(e) => set('partNumber', e.target.value)} disabled={!!editing} placeholder="MX-1001" required />
          </Field>
          <Field label="Nazwa">
            <TextInput value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} placeholder="Silnik osi X" required />
          </Field>
          <Field label="Typ">
            <Select value={form.type ?? 'PART'} onChange={(e) => set('type', e.target.value)}>
              {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </Select>
          </Field>
          <Field label="Jednostka miary">
            <TextInput value={form.unitOfMeasure ?? 'szt'} onChange={(e) => set('unitOfMeasure', e.target.value)} placeholder="szt" />
          </Field>
          <Field label="Pozyskanie (Make/Buy)">
            <Select value={form.makeBuy ?? 'BUY'} onChange={(e) => set('makeBuy', e.target.value)}>
              {MAKEBUY_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
          </Field>
          <Field label="Status cyklu życia">
            <Select value={form.lifecycleStatus ?? 'ACTIVE'} onChange={(e) => set('lifecycleStatus', e.target.value)}>
              {LIFECYCLE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Kategoria">
            <TextInput value={form.category ?? ''} onChange={(e) => set('category', e.target.value)} placeholder="Napędy" />
          </Field>
          <Field label="Materiał">
            <TextInput value={form.material ?? ''} onChange={(e) => set('material', e.target.value)} placeholder="Stal / Aluminium" />
          </Field>
          <Field label="Rewizja">
            <TextInput value={form.revision ?? ''} onChange={(e) => set('revision', e.target.value)} placeholder="A" />
          </Field>
          <Field label="Kod kreskowy / EAN">
            <TextInput value={form.barcode ?? ''} onChange={(e) => set('barcode', e.target.value)} placeholder="590..." />
          </Field>
          <Field label="Lead time (dni)">
            <TextInput type="number" value={form.leadTimeDays ?? ''} onChange={(e) => set('leadTimeDays', e.target.value === '' ? null : Number(e.target.value))} placeholder="14" />
          </Field>
          <Field label="Waga (kg)">
            <TextInput type="number" step="0.001" value={form.weightKg ?? ''} onChange={(e) => set('weightKg', e.target.value === '' ? null : Number(e.target.value))} placeholder="2.5" />
          </Field>
          <Field label="Koszt standardowy">
            <TextInput type="number" step="0.01" value={form.standardCost ?? ''} onChange={(e) => set('standardCost', e.target.value === '' ? null : Number(e.target.value))} placeholder="1250.00" />
          </Field>
          <Field label="Waluta">
            <TextInput value={form.currency ?? 'PLN'} onChange={(e) => set('currency', e.target.value)} placeholder="PLN" />
          </Field>
          <div className="md:col-span-2">
            <Field label="Opis">
              <TextArea rows={3} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} placeholder="Opis techniczny pozycji..." />
            </Field>
          </div>
          {formError && (
            <div className="md:col-span-2 text-xs text-rose-400 bg-rose-900/10 p-2.5 rounded border border-rose-800/30 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {formError}
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-4 rounded-2xl flex items-center gap-3">
      <div className="p-2.5 bg-slate-800/60 rounded-lg">{icon}</div>
      <div>
        <div className="text-2xl font-extrabold text-white">{value}</div>
        <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">{label}</div>
      </div>
    </div>
  );
}
