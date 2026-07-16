"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePMProjects, useProjectTasks, useCreateTask, useRequestMaterial, useReachMilestone, usePMEvm, Task } from '../../../../hooks/usePM';
import SchedulePanel from '../../SchedulePanel';
import GanttBaselinePanel from '../../GanttBaselinePanel';
import InteractiveGanttPanel from '../../InteractiveGanttPanel';
import { 
  Briefcase, ArrowLeft, Plus, LayoutList, Clock, AlertTriangle, CheckCircle, Wallet, ListTodo, Package, Send, Flag, TrendingUp
} from 'lucide-react';

export default function ProjectDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  // Polling / fetching z cache wykorzystujące istniejący hook
  const { data: projects = [], isLoading: isLoadingProjects } = usePMProjects();
  const project = projects.find(p => p.id === id);

  const { data: tasks = [], isLoading: isLoadingTasks } = useProjectTasks(id);
  const createTask = useCreateTask();
  const requestMaterial = useRequestMaterial();
  const reachMilestone = useReachMilestone();
  const { data: evm } = usePMEvm(id);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [milestoneAmount, setMilestoneAmount] = useState('400000');
  const [milestoneFeedback, setMilestoneFeedback] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // Stan dla formularzy materiałowych per Zadanie
  const [matForms, setMatForms] = useState<Record<string, { sku: string, quantity: string }>>({});
  const [matFeedback, setMatFeedback] = useState<Record<string, { status: 'success' | 'error', msg: string }>>({});

  const handleMaterialRequest = async (taskId: string) => {
    const form = matForms[taskId];
    if (!form || !form.sku.trim() || !form.quantity.trim()) return;
    
    setMatFeedback(prev => ({ ...prev, [taskId]: null as any }));

    try {
      await requestMaterial.mutateAsync({ 
        projectId: id, 
        taskId, 
        sku: form.sku, 
        quantity: parseFloat(form.quantity) 
      });
      setMatFeedback(prev => ({ ...prev, [taskId]: { status: 'success', msg: 'Zapotrzebowanie skierowane do NATS' } }));
      setMatForms(prev => ({ ...prev, [taskId]: { sku: '', quantity: '' } }));
    } catch (err: any) {
      setMatFeedback(prev => ({ ...prev, [taskId]: { status: 'error', msg: err.message } }));
    }
  };

  const handleReachMilestone = async (milestone: 'FAT' | 'SAT') => {
    setMilestoneFeedback(null);
    const amount = parseFloat(milestoneAmount);
    if (!amount || amount <= 0) {
      setMilestoneFeedback('Podaj poprawną kwotę milestone');
      return;
    }
    try {
      await reachMilestone.mutateAsync({
        projectId: id,
        milestone,
        amount,
        percent: milestone === 'FAT' ? 40 : 10,
      });
      setMilestoneFeedback(`${milestone} zarejestrowany — Finance + KSeF w toku`);
    } catch (err: unknown) {
      setMilestoneFeedback((err as Error).message);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setErrorStatus(null);
    try {
      await createTask.mutateAsync({ projectId: id, title: newTaskTitle });
      setNewTaskTitle('');
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || 'Nie udało się dodać zadania do rejestru (Gateway / NATS fallback). Spróbuj ponownie.');
    }
  };

  const getTaskStatusBadge = (status: Task['status']) => {
    switch (status) {
      case 'TODO':
        return <span className="px-2.5 py-1 text-xs font-bold text-slate-300 bg-slate-800/80 border border-slate-600/50 rounded flex gap-1 items-center shadow-inner"><LayoutList className="w-3.5 h-3.5"/>TODO</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 text-xs font-bold text-blue-400 bg-blue-900/40 border border-blue-700/50 rounded flex gap-1 items-center shadow-inner"><Clock className="w-3.5 h-3.5"/>IN PROGRESS</span>;
      case 'BLOCKED':
        return <span className="px-2.5 py-1 text-xs font-bold text-rose-400 bg-rose-900/40 border border-rose-700/50 rounded flex gap-1 items-center shadow-inner"><AlertTriangle className="w-3.5 h-3.5"/>BLOCKED</span>;
      case 'DONE':
        return <span className="px-2.5 py-1 text-xs font-bold text-emerald-400 bg-emerald-900/40 border border-emerald-700/50 rounded flex gap-1 items-center shadow-inner"><CheckCircle className="w-3.5 h-3.5"/>DONE</span>;
      default:
        return null;
    }
  };

  if (isLoadingProjects) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4 shadow-[0_0_15px_rgba(59,130,246,0.6)]"></div>
        <p className="text-slate-400 text-sm font-semibold tracking-wider uppercase">Inicjalizacja modułu...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Projekt nie został znaleziony</h2>
        <p className="max-w-md text-slate-500 mb-6">Wymagany zasób nie istnieje w bazie danych PM-Service lub utracono połączenie z serwerem NATS.</p>
        <button onClick={() => router.push('/pm')} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-blue-500/20">Wróc do listy w PM</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col gap-6 relative overflow-hidden">
      
      {/* Decorative Blob */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* HEADER: Glassmorphism */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900/60 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl shadow-2xl shadow-black/50 z-10 relative shrink-0 gap-6">
        <div>
          <button 
            onClick={() => router.push('/pm')}
            className="group flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-400 font-semibold uppercase tracking-wider mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Powrót do PM
          </button>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Briefcase className="w-9 h-9 text-blue-500" />
            {project.name}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-slate-600 text-slate-300 uppercase tracking-widest bg-slate-800">
              STATUS CRM: {project.status}
            </span>
          </div>
        </div>
        
        {/* Budget Metric */}
        <div className="flex items-center gap-4 bg-slate-950/70 px-6 py-4 rounded-xl border border-slate-800/80 shadow-inner">
          <div className="p-3 bg-emerald-500/10 rounded-lg">
            <Wallet className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Całkowity Budżet</div>
            <div className="font-mono text-2xl text-emerald-400 font-bold tracking-tight">
              {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(project.totalBudget)}
            </div>
          </div>
        </div>
      </header>

      <InteractiveGanttPanel projectId={id} />
      <GanttBaselinePanel projectId={id} />
      <SchedulePanel projectId={id} />

      {/* CONTENT AREA */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 z-10 relative">
        
        {/* Left Column: Form & Analytics */}
        <div className="col-span-1 flex flex-col gap-6">
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
              <Plus className="w-5 h-5 text-blue-400" />
              Nowe Zadanie Wykonawcze
            </h2>
            
            <form onSubmit={handleAddTask} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase text-slate-400 font-bold px-1 tracking-wider">Tytuł Zadania</label>
                <input 
                  type="text" 
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="np. Skompletowanie silników dla WBS-1..."
                  className="bg-slate-950/50 border border-slate-700/80 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-200 shadow-inner"
                  disabled={createTask.isPending}
                />
              </div>

              {errorStatus && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-3 py-2 rounded-lg text-sm font-medium flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{errorStatus}</span>
                </div>
              )}

              <button 
                type="submit" 
                disabled={createTask.isPending || !newTaskTitle.trim()}
                className="mt-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
              >
                {createTask.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <ListTodo className="w-4 h-4" />
                )}
                Dodaj do rejestru
              </button>
            </form>
          </div>

          {evm && (
            <div className="bg-slate-900/60 backdrop-blur-md border border-violet-800/40 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-violet-400" />
                Earned Value (EVM)
              </h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                  <p className="text-[10px] uppercase text-slate-500 font-bold">PV</p>
                  <p className="font-mono text-violet-300 font-bold">{new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(evm.plannedValue)}</p>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                  <p className="text-[10px] uppercase text-slate-500 font-bold">EV</p>
                  <p className="font-mono text-emerald-300 font-bold">{new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(evm.earnedValue)}</p>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                  <p className="text-[10px] uppercase text-slate-500 font-bold">AC</p>
                  <p className="font-mono text-rose-300 font-bold">{new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(evm.actualCost)}</p>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                  <p className="text-[10px] uppercase text-slate-500 font-bold">% ukończenia</p>
                  <p className="font-mono text-white font-bold">{evm.percentComplete}%</p>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <span className={`flex-1 text-center py-2 rounded-lg text-xs font-bold border ${
                  evm.cpiStatus === 'GREEN' ? 'bg-emerald-900/30 text-emerald-300 border-emerald-700' :
                  evm.cpiStatus === 'AMBER' ? 'bg-amber-900/30 text-amber-300 border-amber-700' :
                  'bg-rose-900/30 text-rose-300 border-rose-700'
                }`}>CPI {evm.cpi}</span>
                <span className={`flex-1 text-center py-2 rounded-lg text-xs font-bold border ${
                  evm.spiStatus === 'GREEN' ? 'bg-emerald-900/30 text-emerald-300 border-emerald-700' :
                  evm.spiStatus === 'AMBER' ? 'bg-amber-900/30 text-amber-300 border-amber-700' :
                  'bg-rose-900/30 text-rose-300 border-rose-700'
                }`}>SPI {evm.spi}</span>
              </div>
            </div>
          )}

          <div className="bg-slate-900/60 backdrop-blur-md border border-cyan-800/40 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Flag className="w-5 h-5 text-cyan-400" />
              Kamienie milowe (FAT / SAT)
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Uruchamia tor: PM → Finance → TaxLegal (KSeF). Status w module Finanse.
            </p>
            <label className="text-[10px] uppercase text-slate-400 font-bold">Kwota transzy (PLN)</label>
            <input
              type="number"
              value={milestoneAmount}
              onChange={(e) => setMilestoneAmount(e.target.value)}
              className="w-full mt-1 mb-4 bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleReachMilestone('FAT')}
                disabled={reachMilestone.isPending}
                className="flex-1 py-2.5 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white text-sm font-bold rounded-lg"
              >
                Osiągnięto FAT
              </button>
              <button
                type="button"
                onClick={() => handleReachMilestone('SAT')}
                disabled={reachMilestone.isPending}
                className="flex-1 py-2.5 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-bold rounded-lg"
              >
                Osiągnięto SAT
              </button>
            </div>
            {milestoneFeedback && (
              <p className="mt-3 text-xs text-cyan-300/90">{milestoneFeedback}</p>
            )}
          </div>
        </div>

        {/* Right Column: Task List */}
        <div className="col-span-1 lg:col-span-2 bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-xl flex flex-col h-[600px] overflow-hidden">
          <div className="flex items-center justify-between mb-6 shrink-0 border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <LayoutList className="w-5 h-5 text-blue-400" />
              Rejestr Zadań WBS
              <span className="ml-2 bg-slate-800 text-slate-300 text-xs py-0.5 px-2 rounded-full font-mono">{tasks.length}</span>
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
            {isLoadingTasks ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
              </div>
            ) : tasks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 p-6 border-2 border-dashed border-slate-800/80 rounded-xl bg-slate-950/30">
                <ListTodo className="w-12 h-12 text-slate-700 mb-3" />
                <p className="font-semibold text-slate-400">Brak aktywnych zadań</p>
                <p className="text-sm mt-1 text-center max-w-sm">Utwórz pierwsze zadanie wykonawcze za pomocą formularza po lewej stronie, aby rozpocząć śledzenie postępów.</p>
              </div>
            ) : (
              tasks.map((task) => {
                const form = matForms[task.id] || { sku: '', quantity: '' };
                const feedback = matFeedback[task.id];
                const isItemPending = requestMaterial.isPending && requestMaterial.variables?.taskId === task.id;

                return (
                <div 
                  key={task.id} 
                  className="group bg-slate-800/40 hover:bg-slate-800/70 p-4 border border-slate-700/50 hover:border-blue-500/30 rounded-xl transition-all relative overflow-hidden shadow-md flex flex-col gap-3"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-slate-200 text-base">{task.title}</h3>
                      <div className="flex items-center gap-4 mt-2 text-xs font-semibold text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-600" />
                          Wygenerowano: {new Date(task.createdAt).toLocaleDateString('pl-PL')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="shrink-0 flex items-center justify-end">
                      {getTaskStatusBadge(task.status)}
                    </div>
                  </div>

                  {/* Formularz Zapotrzebowania Materialowego (NATS Emitter) */}
                  <div className="mt-2 pt-3 border-t border-slate-700/40 flex flex-col gap-2">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-1.5 mb-1">
                      <Package className="w-3.5 h-3.5 text-blue-400" /> Rezerwacja Materiałów/Magazynu
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <input 
                        type="text" 
                        placeholder="SKU" 
                        value={form.sku}
                        onChange={(e) => setMatForms(prev => ({ ...prev, [task.id]: { ...form, sku: e.target.value } }))}
                        className="bg-slate-900/80 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 w-32 shadow-inner"
                      />
                      <input 
                        type="number" 
                        placeholder="Ilość" 
                        value={form.quantity}
                        onChange={(e) => setMatForms(prev => ({ ...prev, [task.id]: { ...form, quantity: e.target.value } }))}
                        className="bg-slate-900/80 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 w-24 shadow-inner"
                      />
                      <button 
                        onClick={() => handleMaterialRequest(task.id)}
                        disabled={isItemPending || !form.sku || !form.quantity}
                        className="bg-blue-600/80 hover:bg-emerald-600/90 disabled:opacity-40 text-white py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-500/10"
                      >
                        {isItemPending ? <span className="animate-spin h-3.5 w-3.5 border-b-2 border-white rounded-full"></span> : <Send className="w-3.5 h-3.5" />}
                        Rezerwuj z INV
                      </button>
                    </div>

                    {feedback && (
                      <div className={`mt-1 text-xs px-2.5 py-2 rounded-lg flex items-center gap-1.5 border font-semibold ${feedback.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                        {feedback.status === 'success' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                        {feedback.msg}
                      </div>
                    )}
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
