"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  FolderTree,
  Cog,
  ChevronRight,
  ChevronDown,
  PlusCircle,
  Plus,
  Briefcase,
  Flag,
  Calendar,
  Wallet,
  Pencil,
  LayoutDashboard,
  FolderOpen,
  CalendarDays,
  FileWarning,
  Activity
} from 'lucide-react';

import { usePMProjects, useUpdateWBSElement, useAddWBSElement, useReleaseProject, useRequestMaterial, WBSElement, Project } from '../../hooks/usePM';
import BiProjectPanel from './BiProjectPanel';

type TabType = 'dashboard' | 'portfolio' | 'wbs' | 'schedule' | 'eco';

export default function PMDashboard() {
  const { data: projects = [], isLoading: loading } = usePMProjects();
  const addWBSElement = useAddWBSElement();
  const releaseProject = useReleaseProject();
  const [activeTab, setActiveTab] = useState<TabType>('portfolio');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const selectedProject = useMemo(() => projects.find(p => p.id === selectedProjectId) || null, [projects, selectedProjectId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-900/30 text-emerald-400 border-emerald-800/30';
      case 'ENGINEERING': return 'bg-blue-900/30 text-blue-400 border-blue-800/30';
      case 'PRODUCTION': return 'bg-amber-900/30 text-amber-400 border-amber-800/30';
      case 'ASSEMBLY': return 'bg-purple-900/30 text-purple-400 border-purple-800/30';
      case 'NEW': return 'bg-slate-800/50 text-slate-300 border-slate-700/50';
      case 'WAITING_VISIT': return 'bg-blue-900/30 text-blue-400 border-blue-800/30';
      case 'TECH_DRAFT': return 'bg-violet-900/30 text-violet-400 border-violet-800/30';
      case 'QUOTING': return 'bg-indigo-900/30 text-indigo-400 border-indigo-500/30';
      case 'OFFER_SENT': return 'bg-sky-900/30 text-sky-400 border-sky-800/30';
      case 'CLIENT_SIDE': return 'bg-fuchsia-900/30 text-fuchsia-400 border-fuchsia-800/30';
      case 'NEGOTIATION': return 'bg-amber-900/30 text-amber-400 border-amber-800/30';
      case 'ACCEPTED': return 'bg-emerald-900/30 text-emerald-400 border-emerald-800/30';
      default: return 'bg-neutral-800/30 text-neutral-400 border-neutral-700/30';
    }
  };

  // Helper to calculate project min/max dates and total actual costs
  const getProjectStats = useCallback((nodes?: WBSElement[] | null) => {
    let totalActualCost = 0;
    let minDate = new Date('2099-12-31').getTime();
    let maxDate = new Date('2000-01-01').getTime();

    const traverse = (nodeList?: WBSElement[] | null) => {
      if (!nodeList || !Array.isArray(nodeList)) return; // Wycofanie taktyczne

      for (const node of nodeList) {
        totalActualCost += node.actualCost || 0;
        if (node.startDate) minDate = Math.min(minDate, new Date(node.startDate).getTime());
        if (node.endDate) maxDate = Math.max(maxDate, new Date(node.endDate).getTime());
        if (node.startDate && node.isMilestone) maxDate = Math.max(maxDate, new Date(node.startDate).getTime());
        traverse(node.children);
      }
    };
    traverse(nodes);

    if (minDate > maxDate) {
      // Default fallback if no dates
      const now = Date.now();
      minDate = now;
      maxDate = now + 1000 * 60 * 60 * 24 * 30; // + 30 days
    }

    // Add 5% padding to scale
    const span = maxDate - minDate;
    minDate -= span * 0.05;
    if (span === 0) maxDate += 1000 * 60 * 60 * 24 * 30;
    else maxDate += span * 0.05;

    return { totalActualCost, minDate, maxDate };
  }, []);

  const projectStats = useMemo(() => selectedProject ? getProjectStats(selectedProject.children) : null, [selectedProject, getProjectStats]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col gap-6 relative overflow-hidden">
      
      {/* HEADER */}
      <header className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg z-10 relative shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-blue-500" />
            Project Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">Narzędzie kontroli projektów ETO (Timelines & Finances)</p>
        </div>
        
        {/* Sticky Header Context for Selected Project */}
        {selectedProject && projectStats && (
          <div className="flex items-center gap-6 bg-slate-800/50 px-6 py-2 rounded-lg border border-slate-700 shadow-inner">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Aktywny projekt</div>
              <div className="font-bold text-white text-base">{selectedProject.name}</div>
            </div>
            <div className="h-8 w-px bg-slate-700"></div>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Całkowity Budżet</div>
              <div className="font-mono text-emerald-400 font-medium">
                {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(selectedProject.totalBudget || 0)}
              </div>
            </div>
            <div className="h-8 w-px bg-slate-700"></div>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Status (CRM)</div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(selectedProject.status)}`}>
                {selectedProject.status}
              </span>
            </div>
            {selectedProject.status === 'WON' && (
              <>
                <div className="h-8 w-px bg-slate-700"></div>
                <div>
                  <button 
                    onClick={() => releaseProject.mutate(selectedProject.id)}
                    disabled={releaseProject.isPending}
                    className="bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all shadow-lg shadow-purple-500/20"
                  >
                    {releaseProject.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Cog className="w-4 h-4" />} Release to MFG
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </header>

      {/* TABS (like CRM) */}
      <div className="flex gap-2 bg-slate-900/50 p-2 rounded-xl border border-slate-800 w-max z-10 relative shrink-0">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'portfolio', label: 'Rejestr Projektów', icon: FolderOpen },
          { id: 'wbs', label: 'Struktura WBS', icon: FolderTree },
          { id: 'schedule', label: 'Harmonogram', icon: CalendarDays },
          { id: 'eco', label: 'Zmiany Inżynieryjne (ECO)', icon: FileWarning },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-h-0 z-10 relative">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="animate-fade-in-up h-full flex flex-col">
            
            {/* TAB: DASHBOARD (CCPM) */}
            {activeTab === 'dashboard' && (
              <div className="flex-1 flex flex-col gap-6">
                {!selectedProject || !projectStats ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center flex-1 shadow-lg text-center">
                    <LayoutDashboard className="w-16 h-16 text-slate-700 mb-4" />
                    <h2 className="text-2xl font-bold text-slate-300 mb-2">CCPM & EVM Dashboard</h2>
                    <p className="text-slate-500 max-w-md">
                      Wybierz projekt z "Rejestru Projektów", aby załadować Wykres Gorączkowy (Fever Chart) i wskaźniki CCPM.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6 flex-1">
                    <BiProjectPanel projectId={selectedProject.id} />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
                    {/* CCPM Fever Chart */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col relative overflow-hidden">
                      <div className="flex items-center justify-between mb-6 z-10">
                        <div>
                          <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Activity className="text-rose-500 w-5 h-5" />
                            CCPM Fever Chart
                          </h3>
                          <p className="text-sm text-slate-400">Critical Chain Buffer Consumption</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                          selectedProject.feverZone === 'RED' ? 'bg-rose-900/30 text-rose-400 border-rose-800/30' :
                          selectedProject.feverZone === 'YELLOW' ? 'bg-amber-900/30 text-amber-400 border-amber-800/30' :
                          'bg-emerald-900/30 text-emerald-400 border-emerald-800/30'
                        }`}>
                          Strefa: {selectedProject.feverZone || 'GREEN'}
                        </span>
                      </div>

                      <div className="flex-1 relative border-l-2 border-b-2 border-slate-700 ml-8 mb-8 z-10">
                        {/* Y-Axis Label */}
                        <div className="absolute -left-12 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                          Zużycie Bufora (%)
                        </div>
                        {/* X-Axis Label */}
                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-semibold text-slate-500 uppercase tracking-widest">
                          Postęp Łańcucha Krytycznego (%)
                        </div>

                        {/* Background Zones */}
                        <div className="absolute inset-0 overflow-hidden opacity-20">
                          {/* Red Zone */}
                          <div className="absolute inset-0 bg-rose-500" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 66%)' }}></div>
                          {/* Yellow Zone */}
                          <div className="absolute inset-0 bg-amber-500" style={{ clipPath: 'polygon(0 66%, 100% 100%, 100% 100%, 0 100%)' }}></div>
                          {/* Green Zone (bottom right) */}
                          <div className="absolute inset-0 bg-emerald-500" style={{ clipPath: 'polygon(0 100%, 100% 100%, 100% 33%, 0 100%)' }}></div>
                        </div>

                        {/* Grid lines */}
                        {[25, 50, 75, 100].map(val => (
                          <div key={`y-${val}`} className="absolute w-full h-px bg-slate-800" style={{ bottom: `${val}%` }}>
                            <span className="absolute -left-8 -top-2 text-[10px] text-slate-500">{val}</span>
                          </div>
                        ))}
                        {[25, 50, 75, 100].map(val => (
                          <div key={`x-${val}`} className="absolute h-full w-px bg-slate-800" style={{ left: `${val}%` }}>
                            <span className="absolute -bottom-5 -left-3 text-[10px] text-slate-500">{val}</span>
                          </div>
                        ))}

                        {/* Current Status Dot */}
                        {(() => {
                          const progress = Math.min(100, Math.max(0, (projectStats.totalActualCost / (selectedProject.budget || selectedProject.totalBudget || 1)) * 100));
                          const buffer = selectedProject.ccpmBufferPct || 0;
                          return (
                            <div 
                              className="absolute w-4 h-4 rounded-full bg-white border-2 border-slate-900 shadow-[0_0_15px_rgba(255,255,255,0.5)] transform -translate-x-1/2 translate-y-1/2 z-20 transition-all duration-1000"
                              style={{ left: `${progress}%`, bottom: `${buffer}%` }}
                              title={`Postęp: ${progress.toFixed(1)}%, Bufor: ${buffer.toFixed(1)}%`}
                            >
                              <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 hover:opacity-100 pointer-events-none whitespace-nowrap">
                                {progress.toFixed(1)}% / {buffer.toFixed(1)}%
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Project Costing / Erozja Marży */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Wallet className="text-emerald-500 w-5 h-5" />
                            Koszty & WIP (Erozja Marży)
                          </h3>
                          <p className="text-sm text-slate-400">Śledzenie budżetu vs. koszty rzeczywiste</p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-lg flex justify-between items-center">
                          <div>
                            <p className="text-xs text-slate-500 uppercase font-semibold">Zatwierdzony Budżet</p>
                            <p className="text-2xl font-mono text-white mt-1">
                              {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(selectedProject.budget || selectedProject.totalBudget || 0)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-500 uppercase font-semibold">Spalone Koszty (WIP)</p>
                            <p className="text-2xl font-mono text-emerald-400 mt-1">
                              {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(projectStats.totalActualCost)}
                            </p>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-400">Konsumpcja Budżetu</span>
                            <span className="font-bold text-slate-200">
                              {((projectStats.totalActualCost / (selectedProject.budget || selectedProject.totalBudget || 1)) * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-700">
                            <div 
                              className={`h-full ${projectStats.totalActualCost > (selectedProject.budget || selectedProject.totalBudget || 0) ? 'bg-rose-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(100, (projectStats.totalActualCost / (selectedProject.budget || selectedProject.totalBudget || 1)) * 100)}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-6">
                           <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-700/50">
                             <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-1">Długość Łańcucha Kryt.</p>
                             <p className="text-xl font-bold text-slate-200">{selectedProject.totalChainDays || 0} dni</p>
                           </div>
                           <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-700/50">
                             <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-1">Bufor Zużyty / Całkowity</p>
                             <p className="text-xl font-bold text-slate-200">{selectedProject.usedBufferDays || 0} / {selectedProject.totalBufferDays || 0} dni</p>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: REJESTR PROJEKTÓW */}
            {activeTab === 'portfolio' && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex-1 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800">
                      <th className="p-4 font-semibold text-sm text-slate-400 uppercase tracking-wider">Nazwa Projektu</th>
                      <th className="p-4 font-semibold text-sm text-slate-400 uppercase tracking-wider">Faza Projektu</th>
                      <th className="p-4 font-semibold text-sm text-slate-400 uppercase tracking-wider">Całkowity Budżet</th>
                      <th className="p-4 font-semibold text-sm text-slate-400 uppercase tracking-wider">Spalone Koszty</th>
                      <th className="p-4 font-semibold text-sm text-slate-400 uppercase tracking-wider">Rentowność</th>
                      <th className="p-4 font-semibold text-sm text-slate-400 uppercase tracking-wider pr-4">Akcja</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          Brak aktywnych projektów.
                        </td>
                      </tr>
                    ) : (
                      projects.map((project) => {
                        const stats = getProjectStats(project.children);
                        const progressPercent = Math.min((stats.totalActualCost / (project.totalBudget || 1)) * 100, 100);
                        const isOverBudget = stats.totalActualCost > project.totalBudget;
                        
                        return (
                          <tr key={project.id} className="border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors">
                            <td className="p-4 font-medium text-slate-200">{project.name}</td>
                            <td className="p-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                                {project.status}
                              </span>
                            </td>
                            <td className="p-4 text-slate-300 font-mono">
                              {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(project.totalBudget || 0)}
                            </td>
                            <td className={`p-4 font-mono font-medium ${isOverBudget ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(stats.totalActualCost)}
                            </td>
                            <td className="p-4">
                              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
                                <div 
                                  className={`h-full ${isOverBudget ? 'bg-rose-500' : (progressPercent > 80 ? 'bg-amber-400' : 'bg-emerald-500')}`}
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            </td>
                            <td className="p-4 pr-4">
                              <button
                                onClick={() => {
                                  setSelectedProjectId(project.id);
                                  setActiveTab('wbs');
                                }}
                                className="text-blue-400 hover:text-blue-300 font-semibold text-sm flex items-center gap-1 transition-colors bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg"
                              >
                                Otwórz <ChevronRight className="w-4 h-4 mt-0.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB: STRUKTURA WBS */}
            {activeTab === 'wbs' && (
              <div className="flex gap-6 h-full flex-1">
                {/* Project Selector Left Panel */}
                <div className="w-[300px] shrink-0 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                  <div className="p-4 border-b border-slate-800 bg-slate-950/50">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <FolderTree className="text-blue-400 w-4 h-4" />
                      Wybór Projektu
                    </h2>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                    {projects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => setSelectedProjectId(project.id)}
                        className={`w-full p-4 rounded-xl border text-left transition-all ${
                          selectedProjectId === project.id
                            ? 'bg-blue-600/10 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)'
                            : 'bg-slate-950/50 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        <div className="font-medium text-slate-200">{project.name}</div>
                        <div className="text-sm mt-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${getStatusColor(project.status)}`}>
                            {project.status}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* WBS Tree Right Panel */}
                <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col">
                  {selectedProject && projectStats ? (
                    <div className="h-full flex flex-col p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <FolderTree className="text-blue-400 w-5 h-5" />
                          Drzewo WBS
                        </h3>
                        <button 
                          onClick={async () => {
                            const rootName = prompt("Podaj nazwę głównego zadania (WBS Root):");
                            if (rootName) {
                              try {
                                await addWBSElement.mutateAsync({
                                  projectId: selectedProject.id,
                                  parentId: selectedProject.id, // Domyślne mapowanie backendu na węzeł startowy
                                  name: rootName,
                                  type: 'PHASE',
                                  plannedCost: 0
                                });
                              } catch (err) {
                                alert("Wystąpił błąd podczas dodawania zadania WBS.");
                              }
                            }
                          }}
                          disabled={addWBSElement.isPending}
                          className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all shadow-lg shadow-blue-500/20"
                        >
                          {addWBSElement.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Plus className="w-4 h-4" />} Dodaj Zadanie
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">
                        <div className="col-span-8">Element / Nazwa</div>
                        <div className="col-span-4 text-right">Koszty (Plan / Zreal.)</div>
                      </div>

                      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {!selectedProject.children?.length ? (
                          <div className="text-center py-10 text-slate-600">Drzewo WBS jest puste.</div>
                        ) : (
                          selectedProject.children.map((node) => (
                            <WBSNode 
                              key={node.id} 
                              node={node} 
                              level={0} 
                              projectId={selectedProject.id} 
                              minDate={projectStats.minDate}
                              maxDate={projectStats.maxDate}
                              mode="wbs"
                            />
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500 p-12">
                      Wybierz projekt z listy po lewej stronie.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: HARMONOGRAM (Mini-Gantt) */}
            {activeTab === 'schedule' && (
              <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col p-6">
                {selectedProject && projectStats ? (
                  <div className="h-full flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                      <CalendarDays className="text-blue-400 w-5 h-5" />
                      Harmonogram (Mini-Gantt)
                    </h3>

                    <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">
                      <div className="col-span-4">Element / Nazwa</div>
                      <div className="col-span-2">Ramy Czasowe</div>
                      <div className="col-span-6 border-l border-slate-700 pl-4 relative">
                        Oś Czasu
                        {/* Scale markers */}
                        <div className="absolute inset-0 left-4 right-0 flex justify-between px-2 text-[9px] opacity-40 mt-5 pointer-events-none">
                          <span>{new Date(projectStats.minDate).toLocaleDateString('pl-PL')}</span>
                          <span>{new Date((projectStats.minDate + projectStats.maxDate)/2).toLocaleDateString('pl-PL')}</span>
                          <span>{new Date(projectStats.maxDate).toLocaleDateString('pl-PL')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 relative custom-scrollbar mt-4">
                      {/* Render vertical rule lines for Gantt */}
                      <div className="absolute top-0 bottom-0 left-[50%] w-px bg-slate-800 pointer-events-none z-0" />
                      <div className="absolute top-0 bottom-0 left-[75%] w-px bg-slate-800 pointer-events-none z-0" />
                      
                      {!selectedProject.children?.length ? (
                        <div className="text-center py-10 text-slate-600">Harmonogram jest pusty.</div>
                      ) : (
                        selectedProject.children.map((node) => (
                          <WBSNode 
                            key={node.id} 
                            node={node} 
                            level={0} 
                            projectId={selectedProject.id} 
                            minDate={projectStats.minDate}
                            maxDate={projectStats.maxDate}
                            mode="schedule"
                          />
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500 p-12">
                    Należy najpierw wybrać projekt w "Rejestrze Projektów".
                  </div>
                )}
              </div>
            )}

            {/* TAB: ECO (Placeholder) */}
            {activeTab === 'eco' && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center h-full shadow-lg text-center">
                <FileWarning className="w-16 h-16 text-slate-700 mb-4" />
                <h2 className="text-2xl font-bold text-slate-300 mb-2">Zmiany Inżynieryjne (ECO)</h2>
                {selectedProject ? (
                  <p className="text-slate-500 max-w-md">
                    Brak zgłoszonych zmian w projekcie <span className="font-semibold text-slate-300">{selectedProject.name}</span>. Moduł ECO pozwala na rejestrację Request For Change i zatwierdzanie kosztorysów przez zarząd.
                  </p>
                ) : (
                  <p className="text-slate-500 max-w-md">
                    Wybierz projekt w Rejestrze Projektów, aby przeglądać lub dodawać nowe ECO.
                  </p>
                )}
              </div>
            )}
            
          </div>
        )}
      </div>

    </div>
  );
}

function WBSNode({ 
  node, 
  level, 
  projectId, 
  minDate,
  maxDate,
  mode
}: { 
  node: WBSElement, 
  level: number, 
  projectId: string, 
  minDate: number,
  maxDate: number,
  mode: 'wbs' | 'schedule'
}) {
  const updateWBSElement = useUpdateWBSElement();
  const addWBSElement = useAddWBSElement();
  const requestMaterial = useRequestMaterial();
  const [expanded, setExpanded] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Add state
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeType, setNewNodeType] = useState('MODULE');
  const [newNodeCost, setNewNodeCost] = useState('0');

  // Edit state (Optimistic UI)
  const [editStartDate, setEditStartDate] = useState(node.startDate ? node.startDate.split('T')[0] : '');
  const [editEndDate, setEditEndDate] = useState(node.endDate ? node.endDate.split('T')[0] : '');
  const [editActualCost, setEditActualCost] = useState(node.actualCost.toString());
  const [editIsMilestone, setEditIsMilestone] = useState(node.isMilestone);
  
  const [isUpdating, setIsUpdating] = useState(false);

  const isOverBudget = node.actualCost > node.plannedCost;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PHASE': return <FolderTree className="w-4 h-4 text-blue-400" />;
      case 'MACHINE': return <Cog className="w-4 h-4 text-emerald-400" />;
      case 'MODULE': return <Cog className="w-4 h-4 text-purple-400" />;
      case 'SERVICE': return <Wallet className="w-4 h-4 text-amber-400" />;
      default: return <FolderTree className="w-4 h-4 text-neutral-400" />;
    }
  };

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeName) return;

    try {
      await addWBSElement.mutateAsync({
        projectId,
        parentId: node.id,
        name: newNodeName,
        type: newNodeType,
        plannedCost: parseFloat(newNodeCost)
      });
      setIsAdding(false);
      setNewNodeName('');
      setNewNodeCost('0');
      setExpanded(true);
    } catch (err) {
      console.error('Failed to add WBS node', err);
    }
  };

  const saveEdits = async () => {
    setIsUpdating(true);
    try {
      await updateWBSElement.mutateAsync({
        id: node.id,
        startDate: editStartDate ? new Date(editStartDate).toISOString() : null,
        endDate: editEndDate ? new Date(editEndDate).toISOString() : null,
        actualCost: parseFloat(editActualCost || '0'),
        isMilestone: editIsMilestone
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update WBS node', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Mini-Gantt calculations
  let hasValidDates = false;
  let leftPercent = 0;
  let widthPercent = 0;

  if (node.startDate) {
    const startObj = new Date(node.startDate).getTime();
    hasValidDates = true;
    leftPercent = Math.max(0, ((startObj - minDate) / (maxDate - minDate)) * 100);
    
    if (node.isMilestone) {
      widthPercent = 0; // Point in time
    } else if (node.endDate) {
      const endObj = new Date(node.endDate).getTime();
      widthPercent = Math.max(0.5, ((endObj - startObj) / (maxDate - minDate)) * 100);
    } else {
      widthPercent = 1; // Default minimum bar if no end date
    }
  }

  return (
    <div className="w-full relative z-10">
      {/* Node Row */}
      <div 
        className={`grid grid-cols-12 items-center p-2 rounded-lg border bg-slate-800/20 hover:bg-slate-800/50 transition-colors group ${level > 0 ? 'mt-[2px]' : 'mt-2'} ${isUpdating ? 'opacity-50' : 'border-transparent'}`}
      >
        {/* WBS Mode: Full Name (8 cols) / Schedule Mode: Short Name (4 cols) */}
        <div className={`${mode === 'wbs' ? 'col-span-8' : 'col-span-4'} flex items-center pr-2`} style={{ paddingLeft: `${level * 1.25}rem` }}>
          <div className="flex items-center gap-2 min-w-0">
            {node.children.length > 0 ? (
              <button onClick={() => setExpanded(!expanded)} className="text-slate-500 hover:text-white shrink-0">
                {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <div className="w-4 shrink-0" />
            )}
            
            <div className="shrink-0 relative">
              {getTypeIcon(node.type)}
              {node.isMilestone && (
                <div className="absolute -top-1 -right-1 bg-rose-500 rounded-full text-white shadow-[0_0_5px_rgba(244,63,94,0.8)]">
                  <Flag className="w-[10px] h-[10px] p-[1.5px]" />
                </div>
              )}
            </div>

            <span className="font-medium text-sm text-slate-200 truncate" title={node.name}>{node.name}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-slate-800 text-slate-400 uppercase tracking-wide shrink-0 hidden xl:block border border-slate-700">
              {node.type}
            </span>
          </div>

          <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
             <button 
                onClick={() => {
                  const sku = prompt("Podaj kod materiału (SKU):");
                  if (!sku) return;
                  const qtyStr = prompt("Podaj ilość:");
                  if (!qtyStr) return;
                  const qty = parseInt(qtyStr, 10);
                  if (isNaN(qty)) return;
                  requestMaterial.mutate({ projectId, taskId: node.id, sku, quantity: qty });
                }}
                className="p-1 text-slate-500 hover:text-amber-400 transition-colors"
                title="Zapotrzebuj materiał"
              >
                <Wallet className="w-4 h-4" />
              </button>
             <button 
                onClick={() => setIsAdding(!isAdding)}
                className="p-1 text-slate-500 hover:text-blue-400 transition-colors"
                title="Dodaj element potomny"
              >
                <PlusCircle className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="p-1 text-slate-500 hover:text-emerald-400 transition-colors"
                title="Edytuj dane"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
          </div>
        </div>
        
        {/* WBS Mode: Only Costs visible */}
        {mode === 'wbs' && (
          <div className="col-span-4 text-right pr-4 text-xs font-mono flex flex-col justify-center border-l border-slate-700/50 pl-4">
             <div className="text-slate-400">{new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(node.plannedCost)}</div>
             <div className={`font-bold ${node.actualCost > 0 ? (isOverBudget ? 'text-rose-400' : 'text-emerald-400') : 'text-slate-500'}`}>
               {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(node.actualCost)}
             </div>
          </div>
        )}

        {/* Schedule Mode: Dates + Gantt visible */}
        {mode === 'schedule' && (
          <>
            {/* Dates */}
            <div className="col-span-2 flex flex-col justify-center pl-4 border-l border-slate-700/50">
               <div className="flex items-center gap-1.5 text-xs text-slate-400">
                 <Calendar className="w-3.5 h-3.5 text-blue-400/70" />
                 {node.startDate ? new Date(node.startDate).toLocaleDateString('pl-PL') : '-'}
               </div>
               {!node.isMilestone && (
                 <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
                   <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                   {node.endDate ? new Date(node.endDate).toLocaleDateString('pl-PL') : '-'}
                 </div>
               )}
            </div>

            {/* Gantt Line */}
            <div className="col-span-6 h-full flex items-center relative pl-4 border-l border-slate-700/50 overflow-hidden">
               {hasValidDates && (
                 <div 
                   className="absolute flex items-center h-full group/gantt transition-transform hover:z-20"
                   style={{ left: `calc(1rem + ${leftPercent * 0.9}%)`, width: `${Math.max(widthPercent * 0.9, 0.5)}%` }} // 0.9 to give padding for right edge
                 >
                   {node.isMilestone ? (
                     <div className="w-3.5 h-3.5 rotate-45 bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)] z-10 -ml-1.5 cursor-help" title={`Kamień Milowy: ${new Date(node.startDate!).toLocaleDateString()}`} />
                   ) : (
                     <div className={`h-2.5 rounded-full min-w-[4px] relative ${isOverBudget ? 'bg-gradient-to-r from-red-500 to-rose-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'} shadow-lg cursor-help transition-all group-hover/gantt:h-3.5 group-hover/gantt:opacity-100 opacity-90`} style={{ width: '100%' }} title={`Start: ${new Date(node.startDate!).toLocaleDateString()} \nEnd: ${node.endDate ? new Date(node.endDate).toLocaleDateString() : 'TBD'}`}>
                     </div>
                   )}
                 </div>
               )}
            </div>
          </>
        )}
      </div>

      {/* Inline Edit Form */}
      {isEditing && (
        <div 
          className="my-2 p-4 bg-emerald-950/30 border border-emerald-900/50 rounded-xl flex items-center gap-4 shadow-inner"
          style={{ marginLeft: `${level * 1.25}rem` }}
        >
          <div className="flex flex-col gap-1 w-32">
            <label className="text-[10px] uppercase text-emerald-400 font-semibold px-1">Typ</label>
            <div className="flex items-center gap-2">
              <input type="checkbox" id={`milestone-${node.id}`} checked={editIsMilestone} onChange={(e) => setEditIsMilestone(e.target.checked)} className="accent-emerald-500 w-4 h-4" />
              <label htmlFor={`milestone-${node.id}`} className="text-xs text-slate-300 select-none cursor-pointer">Kamień milowy</label>
            </div>
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase text-emerald-400 font-semibold px-1">Data Startu</label>
            <input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50" />
          </div>

          {!editIsMilestone && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase text-emerald-400 font-semibold px-1">Data Końca</label>
              <input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50" />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase text-emerald-400 font-semibold px-1">Wykonanie (Rzeczywiste)</label>
            <input type="number" step="0.01" value={editActualCost} onChange={(e) => setEditActualCost(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs w-32 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50" />
          </div>

          <div className="ml-auto flex gap-2 pt-4">
            <button onClick={saveEdits} disabled={isUpdating} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-md text-xs font-semibold transition-colors">
              Zapisz Zmiany
            </button>
            <button onClick={() => setIsEditing(false)} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors border border-slate-700">
              Anuluj
            </button>
          </div>
        </div>
      )}

      {/* Add Child Form */}
      {isAdding && (
        <div 
          className="my-2 p-3 bg-blue-950/30 border border-blue-900/50 rounded-xl flex items-center gap-3"
          style={{ marginLeft: `${(level + 1) * 1.25}rem` }}
        >
          <form className="flex w-full gap-3" onSubmit={handleAddChild}>
            <input 
              type="text" 
              placeholder="Nazwa elementu..." 
              value={newNodeName}
              onChange={(e) => setNewNodeName(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs flex-grow focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
              required
            />
            <select 
              value={newNodeType}
              onChange={(e) => setNewNodeType(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 text-slate-300"
            >
              <option value="MODULE">Moduł (MODULE)</option>
              <option value="MACHINE">Maszyna (MACHINE)</option>
              <option value="SERVICE">Usługa (SERVICE)</option>
              <option value="PHASE">Faza (PHASE)</option>
            </select>
            <input 
              type="number" 
              step="0.01"
              placeholder="Koszt (Plan)" 
              value={newNodeCost}
              onChange={(e) => setNewNodeCost(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs w-32 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
            />
            <button 
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-md text-xs font-semibold transition-colors"
            >
              Dodaj Nowy
            </button>
            <button 
              type="button"
              onClick={() => setIsAdding(false)}
              className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors border border-slate-700"
            >
              Anuluj
            </button>
          </form>
        </div>
      )}

      {/* Children Recursion */}
      {expanded && node.children.length > 0 && (
        <div className="flex flex-col relative w-full">
          {node.children.map((child) => (
            <WBSNode 
              key={child.id} 
              node={child} 
              level={level + 1} 
              projectId={projectId} 
              minDate={minDate}
              maxDate={maxDate}
              mode={mode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
