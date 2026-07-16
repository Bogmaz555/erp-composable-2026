"use client";

import React, { useState } from 'react';
import {
  PlusCircle, Loader2, ChevronRight, Package, Rocket, AlertTriangle, GitBranch,
} from 'lucide-react';
import {
  usePLMBoms, useBomTree, useAddBomComponent, useReleaseBom, useCreateBom, useEtoExplosion, BomSummary, BomTreeNode,
} from '../../hooks/usePLM';
import { useProducts } from '../../hooks/useProducts';
import { Modal } from '../../components/ui/Modal';
import { Field, TextInput, Select } from '../../components/ui/Field';

function statusBadge(status: string) {
  const map: Record<string, string> = {
    DRAFT: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    RELEASED: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    SUPERSEDED: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
    OBSOLETE: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  };
  return <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${map[status] ?? map.DRAFT}`}>{status}</span>;
}

function TreeNode({ node, depth = 0 }: { node: BomTreeNode; depth?: number }) {
  return (
    <div className="ml-0">
      <div
        className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-slate-800/60 transition-colors"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <GitBranch className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <span className="font-mono text-xs text-slate-400">{node.childItem?.partNumber}</span>
        <span className="text-sm text-slate-200 font-medium truncate">{node.childItem?.name}</span>
        <span className="text-xs text-slate-500 ml-auto font-mono">×{node.quantity}</span>
        {node.subBom && (
          <span className="text-[10px] text-emerald-400 border border-emerald-500/30 px-1.5 rounded">
            sub-BOM Rev {node.subBom.version.revision}
          </span>
        )}
      </div>
      {node.subBom?.components?.map((sub) => (
        <TreeNode key={sub.id} node={sub} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function BomEditor() {
  const { data: boms = [], isLoading } = usePLMBoms();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = boms.find((b) => b.id === selectedId) ?? null;

  const { data: tree, isLoading: treeLoading, error: treeError } = useBomTree(selectedId);
  const addComponent = useAddBomComponent();
  const releaseBom = useReleaseBom();
  const etoExplosion = useEtoExplosion();
  const createBom = useCreateBom();

  const { data: products } = useProducts({ pageSize: 200, active: 'true' });
  const productRows = products?.rows ?? [];

  const [addOpen, setAddOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [childItemId, setChildItemId] = useState('');
  const [qty, setQty] = useState('1');
  const [newBom, setNewBom] = useState({ partNumber: '', description: '', revision: 'A' });
  const [formError, setFormError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!selectedId || !childItemId) return;
    setFormError(null);
    try {
      await addComponent.mutateAsync({
        bomVersionId: selectedId,
        childItemId,
        quantity: parseFloat(qty) || 1,
      });
      setAddOpen(false);
      setChildItemId('');
      setQty('1');
    } catch (e: any) {
      setFormError(e.message);
    }
  };

  const handleRelease = async () => {
    if (!selectedId || !confirm('Zwolnić BOM? Uruchomi rezerwacje magazynowe i MRP.')) return;
    try {
      await releaseBom.mutateAsync(selectedId);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleEtoExplosion = async () => {
    if (!selectedId || !confirm('ETO Explosion: Release BOM + pełny łańcuch INV→MES→Finance?')) return;
    try {
      const result = await etoExplosion.mutateAsync({ bomVersionId: selectedId, projectId: 'proj-eto-demo' });
      alert(`ETO chain: ${result.results?.plmRelease ?? 'ok'} → ${result.correlationId}`);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleCreate = async () => {
    if (!newBom.partNumber.trim()) return;
    setFormError(null);
    try {
      const created = await createBom.mutateAsync(newBom);
      setCreateOpen(false);
      setSelectedId(created.id);
      setNewBom({ partNumber: '', description: '', revision: 'A' });
    } catch (e: any) {
      setFormError(e.message);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      {/* BOM list */}
      <section className="xl:col-span-1 bg-[#0A1428]/80 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-400" /> Rejestr E-BOM
          </h2>
          <button onClick={() => setCreateOpen(true)} className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
            <PlusCircle className="w-4 h-4" />
          </button>
        </div>
        {boms.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-700 rounded-xl text-slate-500">
            Brak BOM. Utwórz pierwszą strukturę.
          </div>
        ) : (
          <ul className="space-y-2 max-h-[520px] overflow-y-auto">
            {boms.map((bom: BomSummary) => (
              <li key={bom.id}
                onClick={() => setSelectedId(bom.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all group ${
                  selectedId === bom.id ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-slate-800/40 border-slate-700 hover:border-indigo-500/30'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-200">{bom.partNumber}</span>
                  <span className="font-mono text-xs text-indigo-400">Rev {bom.revision}</span>
                </div>
                <p className="text-slate-400 text-sm truncate">{bom.description}</p>
                <div className="mt-2 flex items-center justify-between">
                  {statusBadge(bom.status)}
                  <span className="text-xs text-slate-500">{bom.components?.length || 0} komp.</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* BOM tree editor */}
      <section className="xl:col-span-2 bg-[#0A1428]/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl flex flex-col min-h-[560px]">
        <div className="p-4 border-b border-slate-700/50 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-white">
              {selected ? `${selected.partNumber} — Rev ${selected.revision}` : 'Edytor struktury BOM'}
            </h3>
            {selected && <p className="text-xs text-slate-500 mt-0.5">{selected.description}</p>}
          </div>
          {selected && (
            <div className="flex gap-2">
              {selected.status === 'DRAFT' && (
                <>
                  <button onClick={() => setAddOpen(true)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-sm text-white flex items-center gap-1.5 transition-colors">
                    <PlusCircle className="w-4 h-4" /> Dodaj komponent
                  </button>
                  <button onClick={handleRelease} disabled={releaseBom.isPending}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg text-sm text-white font-bold flex items-center gap-1.5 transition-colors">
                    {releaseBom.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                    Release BOM
                  </button>
                  <button onClick={handleEtoExplosion} disabled={etoExplosion.isPending}
                    className="px-3 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded-lg text-sm text-white font-bold flex items-center gap-1.5 transition-colors">
                    {etoExplosion.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                    ETO Explosion
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <ChevronRight className="w-10 h-10 mb-3 opacity-30" />
              <p>Wybierz BOM z listy po lewej stronie</p>
            </div>
          ) : treeLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
          ) : treeError ? (
            <div className="text-rose-400 flex items-center gap-2 p-4">
              <AlertTriangle className="w-5 h-5" /> {(treeError as Error).message}
            </div>
          ) : (
            <div>
              <div className="mb-4 p-3 bg-slate-900/60 rounded-lg border border-slate-700/50 flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-white">{tree?.item?.partNumber}</span>
                <span className="text-slate-400 text-sm">{tree?.item?.name}</span>
                {statusBadge(tree?.status ?? selected.status)}
              </div>
              {(tree?.components?.length ?? 0) === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">Brak komponentów. Dodaj pozycje z Kartoteki Produktów.</p>
              ) : (
                tree!.components.map((node: BomTreeNode) => <TreeNode key={node.id} node={node} />)
              )}
            </div>
          )}
        </div>
      </section>

      {/* Add component modal */}
      <Modal open={addOpen} title="Dodaj komponent do BOM" onClose={() => setAddOpen(false)}
        footer={
          <>
            <button onClick={() => setAddOpen(false)} className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300">Anuluj</button>
            <button onClick={handleAdd} disabled={addComponent.isPending || !childItemId}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold">
              {addComponent.isPending ? 'Dodawanie...' : 'Dodaj'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Pozycja z Kartoteki Produktów">
            <Select value={childItemId} onChange={(e) => setChildItemId(e.target.value)}>
              <option value="">— wybierz —</option>
              {productRows.map((p) => (
                <option key={p.id} value={p.id}>{p.partNumber} — {p.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Ilość">
            <TextInput type="number" min="0.001" step="0.001" value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
          {formError && <p className="text-rose-400 text-sm">{formError}</p>}
        </div>
      </Modal>

      {/* Create BOM modal */}
      <Modal open={createOpen} title="Nowy E-BOM" onClose={() => setCreateOpen(false)}
        footer={
          <>
            <button onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300">Anuluj</button>
            <button onClick={handleCreate} disabled={createBom.isPending}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold disabled:opacity-50">
              Utwórz
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Indeks (partNumber)">
            <TextInput value={newBom.partNumber} onChange={(e) => setNewBom({ ...newBom, partNumber: e.target.value })} placeholder="ASM-1000" />
          </Field>
          <Field label="Opis">
            <TextInput value={newBom.description} onChange={(e) => setNewBom({ ...newBom, description: e.target.value })} placeholder="Zespół napędowy" />
          </Field>
          <Field label="Rewizja">
            <TextInput value={newBom.revision} onChange={(e) => setNewBom({ ...newBom, revision: e.target.value })} />
          </Field>
          {formError && <p className="text-rose-400 text-sm">{formError}</p>}
        </div>
      </Modal>
    </div>
  );
}
