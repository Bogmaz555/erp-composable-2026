"use client";
import * as XLSX from 'xlsx';
import CpqConfigurator from './components/CpqConfigurator';
import NewLeadDrawer from './components/NewLeadDrawer';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Flame,
  FileText,
  Mail,
  MapPin,
  UserPlus,
  Settings2,
  Send,
  Loader2,
  LayoutDashboard,
  Users,
  Kanban,
  X,
  Calendar,
  MessageSquare,
  Clock,
  LineChart,
  Target,
  TrendingUp,
  BrainCircuit,
  AlertTriangle,
  Box,
  UploadCloud,
  PenTool,
  Archive,
  Trash2,
} from 'lucide-react';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

import { useOpportunities, useCatalog, useUpdatePipelineStage, Opportunity, CatalogItem, Customer, Activity, DocumentItem, BOMItem } from '../../hooks/useCRM';
import { useQueryClient } from '@tanstack/react-query';

type TabType = 'dashboard' | 'customers' | 'pipeline' | 'cpq' | 'catalog' | 'schedule' | 'registry';

interface Task {
  id: string;
  title: string;
  type: string;
  dueDate: string;
  priority: string;
  isCompleted: boolean;
  opportunity: { title: string };
}

/**
 * Komponent głównego panelu CRM.
 * Uzasadnienie biznesowe: Wdrożenie architektury "Progressive Disclosure" za pomocą systemu zakładek, Kanbana, oraz bocznej szuflady (Drawer).
 * Eliminuje to konieczność przeładowywania stron i zapewnia agentom B2B płynne przejście z widoku lejka do wyceny technicznej (CPQ).
 */
export default function CRMPage() {
  const { data: opportunities = [], isLoading: loading } = useOpportunities();
  const { data: catalogItems = [] } = useCatalog();
  const updatePipelineStage = useUpdatePipelineStage();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('pipeline');
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [isLeadDrawerOpen, setIsLeadDrawerOpen] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [catalogFilter, setCatalogFilter] = useState('ALL');
  const [isSubmittingCatalog, setIsSubmittingCatalog] = useState(false);
  const [newCatalogItem, setNewCatalogItem] = useState({ name: '', category: '', basePrice: '', currency: 'PLN', sku: '', type: 'HARDWARE' });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Zmienne do Szuflady i Dropzone
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Zmienne do BOM i Excela w Szufladzie
  const [currentBomItems, setCurrentBomItems] = useState<any[]>([]);
  const [isSavingBom, setIsSavingBom] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedOpportunity) {
      setCurrentBomItems(selectedOpportunity.bomItems || []);
    } else {
      setCurrentBomItems([]);
    }
  }, [selectedOpportunity]);

  const handleExportXLSX = () => {
    if (!selectedOpportunity) return;
    const wsData = currentBomItems.map(item => ({
      'SKU': item.catalogItem?.sku || '',
      'Nazwa': item.catalogItem?.name || '',
      'Typ': item.catalogItem?.type || '',
      'Ilość': item.quantity,
      'Cena Jedn.': item.price,
      'Łącznie netto': item.quantity * item.price,
      'Waluta': item.catalogItem?.currency || 'PLN'
    }));
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BOM");
    XLSX.writeFile(wb, `BOM_${selectedOpportunity.title}.xlsx`);
  };

  const [isImporting, setIsImporting] = useState(false);

  const handleImportXLSX = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        // Pass data to AI Mapper endpoint
        const response = await fetch('/api/crm/ai-mapper', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ excelData: data })
        });
        
        if (response.ok) {
          const { mappedItems } = await response.json();
          // We got items back mapped securely
          const combinedItems = [...currentBomItems, ...mappedItems];
          setCurrentBomItems(combinedItems);
          handleSaveBom(combinedItems);
        } else {
          console.error("AI Mapper failed to process the file");
        }
      } catch(err) {
        console.error("Error during import:", err);
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveBom = async (itemsToSave = currentBomItems) => {
    if (!selectedOpportunity) return;
    setIsSavingBom(true);
    try {
      const payload = {
        opportunityId: selectedOpportunity.id,
        items: itemsToSave.map(i => ({
          catalogItemId: i.catalogItem?.id || i.catalogItemId,
          quantity: i.quantity,
          price: i.price
        }))
      };
      const res = await fetch('/api/crm/bom', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchOpportunities();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingBom(false);
    }
  };

  const updateBomItem = (index: number, field: string, value: string | number) => {
    const newItems = [...currentBomItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setCurrentBomItems(newItems);
  };

  /**
   * Formatuje wartość pieniężną z walutą przypisaną do konkretnej Szansy Sprzedaży.
   * Decyzja projektowa: waluta per-Opportunity zamiast globalnej, bo kontrakty ETO
   * w jednym pipeline mogą być jednocześnie w PLN, EUR i USD.
   */
  const formatValue = useCallback(
    (val: number, curr: string = 'PLN'): string => {
      return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: curr,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(val);
    },
    []
  );

  const fetchOpportunities = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['opportunities'] });
  }, [queryClient]);

  const fetchCatalog = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['catalog'] });
  }, [queryClient]);

  const fetchTasks = useCallback(async () => {
    try {
      setLoadingTasks(true);
      const res = await fetch('/api/crm/tasks');
      if (res.ok) {
        setTasks(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  const toggleTaskCompletion = async (taskId: string, currentStatus: boolean) => {
    // Optimistic UI Update
    setTasks(prev => prev.filter(t => t.id !== taskId));
    try {
      const res = await fetch('/api/crm/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, isCompleted: !currentStatus })
      });
      if (!res.ok) {
        fetchTasks();
      }
    } catch (err) {
      console.error('Failed to patch task', err);
      fetchTasks();
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  /**
   * Sumuje przychody z wygranych szans per waluta.
   * Zwraca mapę { PLN: 1200000, EUR: 450000 } — renderowaną jako multi-line w kafelku KPI.
   */
  const revenueByCurrency = useMemo(() => {
    const accepted = opportunities.filter(o => o.status === 'ACCEPTED');
    const grouped: Record<string, number> = {};
    for (const opp of accepted) {
      const curr = opp.currency || 'PLN';
      grouped[curr] = (grouped[curr] || 0) + opp.value;
    }
    return grouped;
  }, [opportunities]);

  const activeOpps = useMemo(
    () => opportunities.filter(o => !['ACCEPTED', 'LOST'].includes(o.status)).length,
    [opportunities]
  );
  const wonCount = useMemo(
    () => opportunities.filter(o => o.status === 'ACCEPTED').length,
    [opportunities]
  );
  const lostCount = useMemo(
    () => opportunities.filter(o => o.status === 'LOST').length,
    [opportunities]
  );
  const totalClosed = wonCount + lostCount;
  const winRate = totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0;

  const weightedPipelineByCurrency = useMemo(() => {
    const probabilities: Record<string, number> = {
      'NEW': 0.1,
      'WAITING_VISIT': 0.2,
      'TECH_DRAFT': 0.3,
      'QUOTING': 0.5,
      'OFFER_SENT': 0.6,
      'CLIENT_SIDE': 0.7,
      'NEGOTIATION': 0.8,
    };
    const grouped: Record<string, number> = {};
    opportunities.forEach(opp => {
      if (['ACCEPTED', 'LOST'].includes(opp.status)) return;
      const prob = probabilities[opp.status] || 0.1;
      const curr = opp.currency || 'PLN';
      grouped[curr] = (grouped[curr] || 0) + (opp.value * prob);
    });
    return grouped;
  }, [opportunities]);

  const averageDealSize = useMemo(() => {
    let sum = 0;
    const closedOpps = opportunities.filter(o => ['ACCEPTED', 'LOST'].includes(o.status));
    if (closedOpps.length === 0) return 0;
    closedOpps.forEach(o => {
      if (!o.currency || o.currency === 'PLN') sum += o.value;
      if (o.currency === 'EUR') sum += o.value * 4.3;
      if (o.currency === 'USD') sum += o.value * 3.9;
    });
    return Math.round(sum / closedOpps.length);
  }, [opportunities]);

  const pipelineCoverageRatio = useMemo(() => {
    const target = 5000000;
    let pipelineTotalNominal = 0;
    opportunities.forEach(o => {
      if (['ACCEPTED', 'LOST'].includes(o.status)) return;
      if (!o.currency || o.currency === 'PLN') pipelineTotalNominal += o.value;
      if (o.currency === 'EUR') pipelineTotalNominal += o.value * 4.3;
      if (o.currency === 'USD') pipelineTotalNominal += o.value * 3.9;
    });
    return (target > 0) ? ((pipelineTotalNominal / target) * 100).toFixed(1) : 0;
  }, [opportunities]);

  const salesCycleLength = useMemo(() => {
    const won = opportunities.filter(o => o.status === 'ACCEPTED');
    if (won.length === 0) return 0;
    let days = 0;
    won.forEach(o => {
      const created = new Date(o.createdAt);
      const diffTime = Math.abs(new Date().getTime() - created.getTime());
      days += Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    });
    return Math.round(days / won.length);
  }, [opportunities]);

  const aiInsights = useMemo(() => [
    { id: 1, title: "Marginal Drop Detected", desc: "Spadek marżowości o 4% w projektach dla sektora Automotive w Q2.", type: "warning" },
    { id: 2, title: "Bottleneck in Quoting", desc: "Średni czas w etapie 'Wycena' wzrósł o 3.4 dnia od zeszłego miesiąca.", type: "danger" },
    { id: 3, title: "High Conversion Probability", desc: "2 szanse w negocjacjach wykazują 92% szans na zamknięcie (historyczny wzorzec).", type: "success" }
  ], []);

  const kanbanColumns = useMemo(() => [
    { id: 'NEW', title: 'Zapytanie (New)', color: 'bg-slate-800/50 border-slate-700/50' },
    { id: 'WAITING_VISIT', title: 'Oczekuje na wizytę', color: 'bg-blue-900/30 border-blue-800/30' },
    { id: 'TECH_DRAFT', title: 'Koncepcja tech.', color: 'bg-violet-900/30 border-violet-800/30' },
    { id: 'QUOTING', title: 'Wycena', color: 'bg-indigo-900/30 border-indigo-500/30' },
    { id: 'OFFER_SENT', title: 'Wysłana oferta', color: 'bg-sky-900/30 border-sky-800/30' },
    { id: 'CLIENT_SIDE', title: 'Oczekuje po str. klienta', color: 'bg-fuchsia-900/30 border-fuchsia-800/30' },
    { id: 'NEGOTIATION', title: 'Negocjacje', color: 'bg-amber-900/30 border-amber-800/30' },
    { id: 'ACCEPTED', title: 'Wygrane (Won)', color: 'bg-emerald-900/30 border-emerald-800/30' },
  ], []);

  const pipelineChartData = useMemo(() => {
    const statusMap = kanbanColumns.reduce((acc, col) => {
      acc[col.id] = { name: col.title, value: 0 };
      return acc;
    }, {} as Record<string, { name: string; value: number }>);

    opportunities.forEach(o => {
      if (statusMap[o.status]) {
        let nominalValue = o.value || 0;
        if (o.currency === 'EUR') nominalValue *= 4.3;
        if (o.currency === 'USD') nominalValue *= 3.9;
        statusMap[o.status].value += nominalValue;
      }
    });
    return Object.values(statusMap);
  }, [opportunities, kanbanColumns]);

  const currencyDistributionData = useMemo(() => {
    const data: Record<string, number> = {};
    opportunities.forEach(o => {
      if (o.status === 'LOST' || o.status === 'ACCEPTED') return;
      const c = o.currency || 'PLN';
      let nomVal = o.value || 0;
      if (c === 'EUR') nomVal *= 4.3;
      if (c === 'USD') nomVal *= 3.9;
      data[c] = (data[c] || 0) + nomVal;
    });
    return Object.entries(data).map(([key, val]) => ({ name: key, value: val }));
  }, [opportunities]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'];

  const handleDragStart = (e: React.DragEvent, oppId: string) => {
    e.dataTransfer.setData('oppId', oppId);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const oppId = e.dataTransfer.getData('oppId');
    if (!oppId) return;

    updatePipelineStage.mutate({ id: oppId, newStage: newStatus });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
        <p className="text-slate-400 font-medium">Ładowanie danych z bazy PostgreSQL...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col gap-6 relative overflow-hidden">

      {/* HEADER */}
      <header className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg z-10 relative shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Building2 className="w-7 h-7 text-indigo-500" />
            CRM &amp; CPQ
          </h1>
          <p className="text-sm text-slate-400 mt-1">Engineer-to-Order Sales Configuration</p>
        </div>
        <div className="flex items-center gap-3">
          {/* New Lead Button */}
          <button
            onClick={() => setIsLeadDrawerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/50 rounded-lg text-sm transition-all uppercase tracking-wider font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40"
          >
            <UserPlus className="w-4 h-4" />
            New Lead
          </button>
        </div>
      </header>

      {/* TABS */}
      <div className="flex gap-2 bg-slate-900/50 p-2 rounded-xl border border-slate-800 w-max z-10 relative shrink-0">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'customers', label: 'Klienci', icon: Users },
          { id: 'pipeline', label: 'Pipeline', icon: Kanban },
          { id: 'cpq', label: 'Konfigurator CPQ', icon: Settings2 },
          { id: 'catalog', label: 'Baza Produktów i Usług', icon: Box },
          { id: 'schedule', label: 'Harmonogram', icon: Calendar },
          { id: 'registry', label: 'Rejestr Ofert', icon: Archive },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg'
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

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="flex flex-col gap-6 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* KPI: Total Revenue — zsumowane per waluta */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex justify-between items-center shadow-lg transition-transform hover:-translate-y-1">
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total Revenue</p>
                  <div className="flex flex-col gap-1">
                    {Object.keys(revenueByCurrency).length > 0 ? (
                      Object.entries(revenueByCurrency).map(([curr, total]) => (
                        <div key={curr} className="flex items-baseline gap-2">
                          <span className="text-xl font-extrabold text-white">{formatValue(total, curr)}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xl font-extrabold text-slate-600">—</span>
                    )}
                  </div>
                </div>
                <div className="bg-emerald-900/40 p-3 rounded-full border border-emerald-800/50">
                  <CircleDollarSign className="w-6 h-6 text-emerald-400" />
                </div>
              </div>

              {/* KPI: Weighted Pipeline */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex justify-between items-center shadow-lg transition-transform hover:-translate-y-1">
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Weighted Pipeline</p>
                  <div className="flex flex-col gap-1">
                    {Object.keys(weightedPipelineByCurrency).length > 0 ? (
                      Object.entries(weightedPipelineByCurrency).map(([curr, total]) => (
                        <div key={curr} className="flex items-baseline gap-2">
                          <span className="text-xl font-extrabold text-white">{formatValue(total, curr)}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xl font-extrabold text-slate-600">—</span>
                    )}
                  </div>
                </div>
                <div className="bg-indigo-900/40 p-3 rounded-full border border-indigo-800/50">
                  <TrendingUp className="w-6 h-6 text-indigo-400" />
                </div>
              </div>

              {/* KPI: Pipeline Coverage */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex justify-between items-center shadow-lg transition-transform hover:-translate-y-1">
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Target Coverage</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-white">{pipelineCoverageRatio}%</span>
                  </div>
                  <p className="text-slate-500 text-xs mt-1">vs Q2 Target (5M PLN)</p>
                </div>
                <div className="bg-sky-900/40 p-3 rounded-full border border-sky-800/50">
                  <Target className="w-6 h-6 text-sky-400" />
                </div>
              </div>

              {/* KPI: Win Rate & Active Opps */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex justify-between items-center shadow-lg transition-transform hover:-translate-y-1">
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Win Rate / Active</p>
                  <div className="flex items-baseline gap-4 mt-1">
                    <div>
                      <span className="text-2xl font-extrabold text-white">{winRate}%</span>
                    </div>
                    <div className="text-xl font-bold text-slate-400">
                      {activeOpps} <span className="text-xs font-normal">opps</span>
                    </div>
                  </div>
                </div>
                <div className="bg-fuchsia-900/40 p-3 rounded-full border border-fuchsia-800/50">
                  <Flame className="w-6 h-6 text-fuchsia-400" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
              {/* Chart / Extended metrics placeholder */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <LineChart className="w-5 h-5 text-indigo-400" />
                    Sales Velocity & Average Deal
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Average Deal Size (Closed)</p>
                    <p className="text-3xl font-extrabold text-slate-200">{formatValue(averageDealSize, 'PLN')}</p>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Sales Cycle</p>
                    <p className="text-3xl font-extrabold text-slate-200">{salesCycleLength} <span className="text-sm font-medium text-slate-500">Days</span></p>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 h-72">
                  <div className="w-full h-full bg-slate-950/50 border border-slate-800 rounded-xl p-4 flex flex-col hover:border-indigo-500/30 transition-colors">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">Pipeline by Status (PLN equivalent)</p>
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={pipelineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={10} tick={{fill: '#64748b'}} tickLine={false} axisLine={false} />
                          <YAxis stroke="#64748b" fontSize={10} tick={{fill: '#64748b'}} tickLine={false} axisLine={false} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                          <Tooltip 
                            cursor={{fill: '#1e293b'}} 
                            contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)'}} 
                            itemStyle={{color: '#818cf8', fontWeight: 'bold'}} 
                            formatter={(value: number) => [`${(value).toLocaleString('pl-PL')} PLN`, 'Value']}
                          />
                          <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="w-full h-full bg-slate-950/50 border border-slate-800 rounded-xl p-4 flex flex-col hover:border-indigo-500/30 transition-colors">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">Active Pipeline by Currency</p>
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={currencyDistributionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            stroke="#0f172a"
                            strokeWidth={3}
                            dataKey="value"
                            paddingAngle={2}
                          >
                            {currencyDistributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)'}} 
                            itemStyle={{color: '#f8fafc', fontWeight: 'bold'}} 
                            formatter={(value: number) => [`${(value).toLocaleString('pl-PL')} PLN Equiv.`, 'Value']}
                          />
                          <Legend iconType="circle" wrapperStyle={{fontSize: '11px', color: '#94a3b8'}} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Anomaly Detection */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-indigo-400" />
                    AI Insights
                  </h3>
                  <span className="bg-indigo-500/10 text-indigo-400 text-xs font-bold px-2 py-1 rounded border border-indigo-500/20">Live</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                  {aiInsights.map(insight => (
                    <div key={insight.id} className={`p-4 rounded-lg border ${
                      insight.type === 'warning' ? 'bg-amber-900/10 border-amber-800/40' :
                      insight.type === 'danger' ? 'bg-red-900/10 border-red-800/40' :
                      'bg-emerald-900/10 border-emerald-800/40'
                    }`}>
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${
                          insight.type === 'warning' ? 'text-amber-400' :
                          insight.type === 'danger' ? 'text-red-400' :
                          'text-emerald-400'
                        }`} />
                        <div>
                          <h4 className={`text-sm font-bold ${
                            insight.type === 'warning' ? 'text-amber-200' :
                            insight.type === 'danger' ? 'text-red-200' :
                            'text-emerald-200'
                          }`}>{insight.title}</h4>
                          <p className="text-slate-400 text-xs mt-1 leading-relaxed">{insight.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOMERS TAB */}
        {activeTab === 'customers' && (
          <div className="flex-1 overflow-auto bg-slate-900 border border-slate-800 rounded-xl shadow-lg relative p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl text-white font-bold flex items-center gap-2">
                <Users className="w-6 h-6 text-indigo-400" />
                Baza Klientów
              </h2>
              <button className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20">
                <UserPlus className="w-4 h-4" /> Nowy Klient
              </button>
            </div>
            
            <div className="overflow-x-auto rounded-lg border border-slate-800 flex-1">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950 uppercase tracking-wider text-xs font-semibold text-slate-400">
                  <tr>
                    <th className="p-4 border-b border-slate-800">Nazwa Klienta</th>
                    <th className="p-4 border-b border-slate-800">NIP</th>
                    <th className="p-4 border-b border-slate-800">Email</th>
                    <th className="p-4 border-b border-slate-800 text-right">Data Dodania</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 bg-slate-900">
                  {(() => {
                    const uniqueCustomers = Array.from(new Map(opportunities.map(o => [o.customerId, o.customer])).values())
                      .filter((c): c is Customer => !!c);
                    
                    if (uniqueCustomers.length === 0) {
                      return (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-slate-500 italic">
                            Brak klientów w bazie.
                          </td>
                        </tr>
                      );
                    }

                    return uniqueCustomers.map((customer: Customer) => (
                      <tr key={customer.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="p-4">
                          <div className="font-semibold text-slate-200">{customer.name}</div>
                          <div className="text-xs text-slate-500 font-mono">ID: {customer.id}</div>
                        </td>
                        <td className="p-4 font-mono text-slate-300">{customer.nip || '-'}</td>
                        <td className="p-4 text-slate-400">
                          <span className="flex items-center gap-2"><Mail className="w-4 h-4" /> {customer.email || '-'}</span>
                        </td>
                        <td className="p-4 text-right text-slate-400">
                          {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PIPELINE KANBAN TAB */}
        {activeTab === 'pipeline' && (
          <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
            {kanbanColumns.map(col => {
              const colOpps = opportunities.filter(o => o.status === col.id);

              return (
                <div 
                  key={col.id} 
                  className={`flex-1 min-w-[300px] rounded-xl border flex flex-col ${col.color}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.id)}
                >
                  <div className="p-4 border-b border-black/20 flex justify-between items-center bg-black/10">
                    <h3 className="font-bold text-sm tracking-wide text-slate-200 uppercase">{col.title}</h3>
                    <span className="text-xs bg-black/30 px-2 py-1 rounded text-slate-400 font-mono">
                      {colOpps.length}
                    </span>
                  </div>
                  <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-3 custom-scrollbar">
                    {colOpps.length === 0 ? (
                      <div className="text-slate-500 text-center py-8 text-sm italic">Brak ofert</div>
                    ) : colOpps.map(opp => (
                      <div
                        key={opp.id}
                        onClick={() => setSelectedOpportunity(opp)}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, opp.id)}
                        className="bg-slate-900 border border-slate-700/50 p-4 rounded-lg shadow-sm hover:border-indigo-500/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] cursor-grab active:cursor-grabbing transition-all group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors">{opp.title}</h4>
                        </div>
                        <p className="text-xs font-medium text-slate-400 mb-3 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {opp.customer?.name}
                        </p>
                        <div className="flex justify-between items-end mt-4 pt-3 border-t border-slate-800">
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(opp.createdAt).toLocaleDateString()}
                          </span>
                          <span className="font-bold text-emerald-400 text-sm">
                            {formatValue(opp.value, opp.currency)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CPQ TAB */}
        {activeTab === 'cpq' && (
          <CpqConfigurator />
        )}

        {/* CATALOG TAB */}
        {activeTab === 'catalog' && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex-1 shadow-lg overflow-y-auto w-full">
            <h2 className="text-xl text-white font-bold mb-6 flex items-center gap-2">
              <Box className="w-6 h-6 text-indigo-400" />
              Baza Produktów i Usług
            </h2>
            
            {/* Inline Form */}
            <div className="mb-8 bg-slate-950/50 p-5 rounded-xl border border-slate-800 shadow-inner">
              <h3 className="font-semibold text-slate-300 mb-4 text-sm uppercase tracking-wider">Dodaj nową pozycję</h3>
              <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Nazwa</label>
                  <input type="text" value={newCatalogItem.name} onChange={e => setNewCatalogItem({...newCatalogItem, name: e.target.value})} placeholder="np. Robot KUKA" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Typ Elementu</label>
                  <select value={newCatalogItem.type} onChange={e => setNewCatalogItem({...newCatalogItem, type: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-indigo-500">
                    <option value="HARDWARE">Maszyna / Sprzęt</option>
                    <option value="SERVICE">Usługa Inżynieryjna</option>
                    <option value="SOFTWARE">Software / Licencja</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Kategoria</label>
                  <select value={newCatalogItem.category} onChange={e => setNewCatalogItem({...newCatalogItem, category: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-indigo-500">
                    <option value="">Wybierz...</option>
                    <option value="ROBOT">ROBOT</option>
                    <option value="CONVEYOR">CONVEYOR</option>
                    <option value="PALLETIZER">PALLETIZER</option>
                    <option value="SOFTWARE">SOFTWARE</option>
                    <option value="SERVICE">SERVICE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
                    {newCatalogItem.type === 'SERVICE' ? 'Stawka / Ryczałt' : 'Cena bazowa'}
                  </label>
                  <input type="number" value={newCatalogItem.basePrice} onChange={e => setNewCatalogItem({...newCatalogItem, basePrice: e.target.value})} placeholder="np. 50000" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Waluta</label>
                  <select value={newCatalogItem.currency} onChange={e => setNewCatalogItem({...newCatalogItem, currency: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-indigo-500">
                    <option value="PLN">PLN</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">SKU</label>
                  <input type="text" value={newCatalogItem.sku} onChange={e => setNewCatalogItem({...newCatalogItem, sku: e.target.value})} placeholder="np. RB-01" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <button 
                disabled={!newCatalogItem.name || !newCatalogItem.category || !newCatalogItem.basePrice || !newCatalogItem.sku || isSubmittingCatalog}
                onClick={async () => {
                  setIsSubmittingCatalog(true);
                  try {
                    const res = await fetch('/api/crm/catalog', {
                      method: 'POST',
                      headers: {'Content-Type': 'application/json'},
                      body: JSON.stringify(newCatalogItem)
                    });
                    if (res.ok) {
                      setNewCatalogItem({ name: '', category: '', basePrice: '', currency: 'PLN', sku: '', type: 'HARDWARE' });
                      fetchCatalog();
                    }
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setIsSubmittingCatalog(false);
                  }
                }}
                className="mt-4 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/20 w-full md:w-auto flex items-center justify-center gap-2"
              >
                {isSubmittingCatalog ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Zapisz do bazy
              </button>
            </div>

            {/* Toggle Filters */}
            <div className="flex gap-2 mb-4 bg-slate-900/50 p-1 rounded-lg border border-slate-800 w-max shrink-0 shadow-inner">
               {[{id: 'ALL', label: 'Wszystko'}, {id: 'HARDWARE', label: 'Sprzęt'}, {id: 'SERVICE', label: 'Usługi'}, {id: 'SOFTWARE', label: 'Software'}].map(f => (
                   <button 
                       key={f.id} 
                       onClick={() => setCatalogFilter(f.id)} 
                       className={`px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${catalogFilter === f.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                   >
                       {f.label}
                   </button>
               ))}
            </div>

            {/* Catalog Table */}
            <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-inner flex-1 overflow-y-auto">
              <table className="w-full text-left text-sm text-slate-400">
                <thead className="bg-slate-900/50 text-slate-300 border-b border-slate-800">
                  <tr>
                    <th className="p-4 font-semibold uppercase tracking-wider text-xs">SKU</th>
                    <th className="p-4 font-semibold uppercase tracking-wider text-xs">Nazwa</th>
                    <th className="p-4 font-semibold uppercase tracking-wider text-xs">Typ</th>
                    <th className="p-4 font-semibold uppercase tracking-wider text-xs">Kategoria</th>
                    <th className="p-4 font-semibold uppercase tracking-wider text-xs text-right">Cena</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {catalogItems.filter(item => catalogFilter === 'ALL' || item.type === catalogFilter).length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-600">Brak pozycji spełniających kryteria.</td></tr>
                  ) : catalogItems.filter(item => catalogFilter === 'ALL' || item.type === catalogFilter).map(item => (
                    <tr key={item.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="p-4 font-mono text-xs text-slate-500">{item.sku}</td>
                      <td className="p-4 text-slate-200 font-medium">{item.name}</td>
                      <td className="p-4">
                        <span className={`text-xs px-2 py-1 rounded font-semibold tracking-wider ${item.type === 'HARDWARE' ? 'bg-indigo-900/50 text-indigo-400' : item.type === 'SERVICE' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-purple-900/50 text-purple-400'}`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded font-semibold tracking-wider">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono text-sm font-bold text-slate-200">{formatValue(item.basePrice, item.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeTab === 'schedule' && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex-1 shadow-lg overflow-y-auto w-full">
            <h2 className="text-xl text-white font-bold mb-6 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-indigo-400" />
              Harmonogram Zadań
            </h2>
            {loadingTasks ? (
              <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>
            ) : (
              <div className="space-y-8">
                {/* ZALEGŁE */}
                <div className="bg-slate-950/50 p-5 rounded-xl border border-rose-900/50 shadow-inner">
                  <h3 className="font-semibold text-rose-400 mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Zaległe
                  </h3>
                  <div className="space-y-3">
                    {tasks.filter(t => new Date(t.dueDate) < new Date(new Date().setHours(0,0,0,0))).length === 0 && <p className="text-slate-500 text-sm">Brak zaległych zadań.</p>}
                    {tasks.filter(t => new Date(t.dueDate) < new Date(new Date().setHours(0,0,0,0))).map(task => (
                      <div key={task.id} className="flex items-center gap-4 bg-slate-900 border border-rose-900/30 p-4 rounded-lg hover:border-rose-500/50 transition-colors group">
                        <button onClick={() => toggleTaskCompletion(task.id, task.isCompleted)} className="w-6 h-6 rounded border border-rose-500/50 flex items-center justify-center hover:bg-rose-500/20 text-transparent hover:text-rose-400 transition-colors">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <div className="flex-1">
                          <p className="text-slate-200 font-medium">{task.title}</p>
                          <p className="text-xs text-slate-500 mt-1">{task.opportunity?.title} • {new Date(task.dueDate).toLocaleDateString()}</p>
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-1 rounded">{task.priority}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* NA DZISIAJ */}
                <div className="bg-slate-950/50 p-5 rounded-xl border border-amber-900/50 shadow-inner">
                  <h3 className="font-semibold text-amber-400 mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Na Dzisiaj
                  </h3>
                  <div className="space-y-3">
                    {tasks.filter(t => new Date(t.dueDate).toDateString() === new Date().toDateString()).length === 0 && <p className="text-slate-500 text-sm">Brak zadań na dzisiaj.</p>}
                    {tasks.filter(t => new Date(t.dueDate).toDateString() === new Date().toDateString()).map(task => (
                      <div key={task.id} className="flex items-center gap-4 bg-slate-900 border border-amber-900/30 p-4 rounded-lg hover:border-amber-500/50 transition-colors group">
                        <button onClick={() => toggleTaskCompletion(task.id, task.isCompleted)} className="w-6 h-6 rounded border border-amber-500/50 flex items-center justify-center hover:bg-amber-500/20 text-transparent hover:text-amber-400 transition-colors">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <div className="flex-1">
                          <p className="text-slate-200 font-medium">{task.title}</p>
                          <p className="text-xs text-slate-500 mt-1">{task.opportunity?.title} • {new Date(task.dueDate).toLocaleDateString()}</p>
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-1 rounded">{task.priority}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* NADCHODZĄCE */}
                <div className="bg-slate-950/50 p-5 rounded-xl border border-emerald-900/50 shadow-inner">
                  <h3 className="font-semibold text-emerald-400 mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Nadchodzące
                  </h3>
                  <div className="space-y-3">
                    {tasks.filter(t => new Date(t.dueDate) > new Date(new Date().setHours(23,59,59,999))).length === 0 && <p className="text-slate-500 text-sm">Brak nadchodzących zadań.</p>}
                    {tasks.filter(t => new Date(t.dueDate) > new Date(new Date().setHours(23,59,59,999))).map(task => (
                      <div key={task.id} className="flex items-center gap-4 bg-slate-900 border border-emerald-900/30 p-4 rounded-lg hover:border-emerald-500/50 transition-colors group">
                        <button onClick={() => toggleTaskCompletion(task.id, task.isCompleted)} className="w-6 h-6 rounded border border-emerald-500/50 flex items-center justify-center hover:bg-emerald-500/20 text-transparent hover:text-emerald-400 transition-colors">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <div className="flex-1">
                          <p className="text-slate-200 font-medium">{task.title}</p>
                          <p className="text-xs text-slate-500 mt-1">{task.opportunity?.title} • {new Date(task.dueDate).toLocaleDateString()}</p>
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">{task.priority}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SLIDE-OVER DRAWER FOR OPPORTUNITY DETAILS */}
      {selectedOpportunity && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedOpportunity(null)}
          />

          {/* Drawer Panel */}
          <div className="relative w-1/3 min-w-[400px] max-w-2xl h-full bg-slate-900/95 border-l border-slate-800 shadow-2xl flex flex-col shadow-black/50 overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-900 sticky top-0 z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">
                    {selectedOpportunity.status}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-700/50 px-2 py-1 rounded">
                    {selectedOpportunity.currency || 'PLN'}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white mt-3">{selectedOpportunity.title}</h2>
                <div className="font-mono text-2xl font-bold text-slate-200 mt-2">
                  {formatValue(selectedOpportunity.value, selectedOpportunity.currency)}
                </div>
              </div>
              <button
                onClick={() => setSelectedOpportunity(null)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
                aria-label="Zamknij"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 space-y-8">
              <section>
                <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-4 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" /> Client Details
                </h3>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-inner">
                  <h4 className="font-bold text-slate-200 text-lg mb-4">{selectedOpportunity.customer?.name}</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      <Mail className="w-4 h-4 text-slate-600" />
                      {selectedOpportunity.customer?.email || 'Brak adresu email'}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      <MapPin className="w-4 h-4 text-slate-600" />
                      NIP: {selectedOpportunity.customer?.nip || 'Brak danych'}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      <Calendar className="w-4 h-4 text-slate-600" />
                      Dodano: {selectedOpportunity.customer?.createdAt ? new Date(selectedOpportunity.customer.createdAt).toLocaleDateString() : '-'}
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Opportunity Meta
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                    <p className="text-slate-500 text-xs font-semibold mb-1 uppercase tracking-wider">TKW</p>
                    <p className="text-slate-200 font-bold font-mono">{selectedOpportunity.tkw}H</p>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                    <p className="text-slate-500 text-xs font-semibold mb-1 uppercase tracking-wider">ID</p>
                    <p className="text-slate-200 font-mono text-xs truncate" title={selectedOpportunity.id}>
                      ...{selectedOpportunity.id.slice(-6)}
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold flex items-center gap-2">
                    <Box className="w-4 h-4" /> BOM (Lista Elementów)
                  </h3>
                  <div className="flex gap-2">
                    <input type="file" accept=".xlsx" ref={fileInputRef} className="hidden" onChange={handleImportXLSX} />
                    <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="px-3 py-1.5 bg-indigo-900/40 hover:bg-indigo-800/50 border border-indigo-700/50 text-indigo-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50">
                      {isImporting ? <Loader2 className="w-3 h-3 animate-spin"/> : <BrainCircuit className="w-3 h-3" />} Import z Excela (AI Mapper)
                    </button>
                    <button onClick={handleExportXLSX} className="px-3 py-1.5 bg-green-900/30 hover:bg-green-800/40 border border-green-800/50 text-green-400 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 shadow-sm">
                      <Box className="w-3 h-3" /> Eksportuj (.xlsx)
                    </button>
                    <button onClick={() => handleSaveBom()} disabled={isSavingBom} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1 shadow-lg shadow-emerald-500/20 disabled:opacity-50">
                      {isSavingBom ? <Loader2 className="w-3 h-3 animate-spin"/> : <CheckCircle2 className="w-3 h-3"/>} Zapisz
                    </button>
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
                  <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-900 border-b border-slate-800">
                      <tr>
                        <th className="p-3 font-semibold uppercase tracking-wider text-[10px] text-slate-500">Nazwa</th>
                        <th className="p-3 font-semibold uppercase tracking-wider text-[10px] text-slate-500">Typ</th>
                        <th className="p-3 font-semibold uppercase tracking-wider text-[10px] text-slate-500 w-20 text-center">Ilość</th>
                        <th className="p-3 font-semibold uppercase tracking-wider text-[10px] text-slate-500 w-28 text-right">Cena Jedn.</th>
                        <th className="p-3 font-semibold uppercase tracking-wider text-[10px] text-slate-500 text-right">Łącznie</th>
                        <th className="p-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {currentBomItems.length === 0 ? (
                        <tr><td colSpan={6} className="p-6 text-center text-slate-500 text-sm">Brak elementów w BOM. Użyj importu lub dodaj pozycje z CPQ.</td></tr>
                      ) : currentBomItems.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-900/50 transition-colors group">
                          <td className="p-3 text-slate-200 font-medium text-xs break-words">{item.catalogItem?.name}</td>
                          <td className="p-3">
                             <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                               item.catalogItem?.type === 'HARDWARE' ? 'bg-indigo-900/50 text-indigo-400' :
                               item.catalogItem?.type === 'SERVICE' ? 'bg-emerald-900/50 text-emerald-400' :
                               'bg-purple-900/50 text-purple-400'
                             }`}>
                               {item.catalogItem?.type}
                             </span>
                          </td>
                          <td className="p-3">
                             <input type="number" min="1" value={item.quantity} onChange={e => updateBomItem(idx, 'quantity', parseInt(e.target.value) || 0)} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono" />
                          </td>
                          <td className="p-3">
                             <input type="number" min="0" step="0.01" value={item.price} onChange={e => updateBomItem(idx, 'price', parseFloat(e.target.value) || 0)} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white text-right focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono" />
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-200 text-xs">
                             {formatValue(item.quantity * item.price, item.catalogItem?.currency || 'PLN')}
                          </td>
                          <td className="p-3 text-center">
                             <button onClick={() => { const newItems = [...currentBomItems]; newItems.splice(idx,1); setCurrentBomItems(newItems); }} className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                                <Trash2 className="w-4 h-4"/>
                             </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Suma Wartości BOM Netto</span>
                    <span className="font-extrabold text-white text-lg">
                       {formatValue(currentBomItems.reduce((acc, item) => acc + (item.quantity * item.price), 0), selectedOpportunity.currency || 'PLN')}
                    </span>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-4 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4" /> Dokumentacja Projektowa
                </h3>
                <div 
                  className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all ${
                    isDragOver ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    if (!selectedOpportunity || !e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
                    
                    const file = e.dataTransfer.files[0];
                    setIsUploadingDoc(true);
                    try {
                      const extMatch = file.name.match(/\.([^.]+)$/);
                      const fileType = extMatch ? extMatch[1].toUpperCase() : 'DOC';
                      
                      const res = await fetch('/api/crm/documents', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          opportunityId: selectedOpportunity.id,
                          fileName: file.name,
                          fileType: fileType,
                          fileUrl: '', 
                        }),
                      });
                      
                      if (res.ok) {
                        await queryClient.invalidateQueries({ queryKey: ['opportunities'] });
                        const freshData = queryClient.getQueryData<Opportunity[]>(['opportunities']);
                        if (freshData) {
                          const refreshed = freshData.find(o => o.id === selectedOpportunity.id);
                          if (refreshed) setSelectedOpportunity(refreshed);
                        }
                      }
                    } catch (err) {
                      console.error('Failed to upload document', err);
                    } finally {
                      setIsUploadingDoc(false);
                    }
                  }}
                >
                  {isUploadingDoc ? (
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
                  ) : (
                    <UploadCloud className={`w-8 h-8 mb-2 ${isDragOver ? 'text-indigo-400' : 'text-slate-600'}`} />
                  )}
                  <p className="text-sm text-slate-400 text-center">
                    Przeciągnij i upuść pliki dokumentacji technicznej tutaj.<br/>
                    <span className="text-xs text-slate-500">(Zrozumiane formaty: PDF, CAD, DOCX)</span>
                  </p>
                </div>

                {/* Lista Z dokumentami */}
                {selectedOpportunity.documents && selectedOpportunity.documents.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {selectedOpportunity.documents.map((doc) => (
                      <div key={doc.id} className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-950 rounded text-indigo-400">
                            {doc.fileType === 'PDF' ? <FileText className="w-4 h-4" /> : doc.fileType === 'CAD' ? <PenTool className="w-4 h-4" /> : <Box className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-200 truncate max-w-[180px]">{doc.fileName}</p>
                            <p className="text-xs text-slate-500">{new Date(doc.uploadedAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          Pobierz
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* TIMELINE — Oś Czasu Notatek */}
              <section>
                <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-4 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Notatki &amp; Oś Czasu
                </h3>

                {/* Formularz dodawania notatki */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-4 shadow-inner">
                  <textarea
                    ref={noteTextareaRef}
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Wpisz notatkę do tego projektu..."
                    rows={3}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 resize-none backdrop-blur-sm transition-all"
                  />
                  <button
                    disabled={!newNoteContent.trim() || isSubmittingNote}
                    onClick={async () => {
                      if (!selectedOpportunity || !newNoteContent.trim()) return;
                      setIsSubmittingNote(true);
                      try {
                        const res = await fetch('/api/crm/activities', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            opportunityId: selectedOpportunity.id,
                            content: newNoteContent.trim(),
                            type: 'NOTE',
                          }),
                        });
                        if (res.ok) {
                          setNewNoteContent('');
                          await queryClient.invalidateQueries({ queryKey: ['opportunities'] });
                          const freshData = queryClient.getQueryData<Opportunity[]>(['opportunities']);
                          if (freshData) {
                            const refreshed = freshData.find(o => o.id === selectedOpportunity.id);
                            if (refreshed) setSelectedOpportunity(refreshed);
                          }
                        }
                      } catch (err) {
                        console.error('Failed to add note', err);
                      } finally {
                        setIsSubmittingNote(false);
                      }
                    }}
                    className="mt-3 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                  >
                    {isSubmittingNote ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MessageSquare className="w-4 h-4" />
                    )}
                    Dodaj Notatkę
                  </button>
                </div>

                {/* Oś czasu — pionowa timeline */}
                {selectedOpportunity.activities && selectedOpportunity.activities.length > 0 ? (
                  <div className="relative pl-6 space-y-4">
                    {/* Pionowa linia */}
                    <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gradient-to-b from-indigo-500/60 via-slate-700 to-transparent" />

                    {selectedOpportunity.activities.map((activity) => (
                      <div key={activity.id} className="relative group">
                        {/* Dot na osi */}
                        <div className="absolute -left-6 top-1.5 w-[11px] h-[11px] rounded-full border-2 border-indigo-500 bg-slate-950 group-hover:bg-indigo-500 transition-colors shadow-[0_0_8px_rgba(99,102,241,0.4)]" />

                        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 hover:border-indigo-500/30 transition-all">
                          <p className="text-sm text-slate-300 leading-relaxed">{activity.content}</p>
                          <p className="text-xs text-slate-600 mt-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(activity.createdAt).toLocaleString('pl-PL', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 text-center py-4 italic">Brak notatek. Dodaj pierwszą powyżej.</p>
                )}
              </section>

              <div className="pt-4 border-t border-slate-800 pb-8 text-center text-slate-500 text-xs uppercase tracking-wider font-semibold">
                — Koniec Szuflady —
              </div>
            </div>
          </div>
        </div>
      )}



      {/* REJESTR OFERT TAB */}
      {activeTab === 'registry' && (
        <div className="flex-1 overflow-auto bg-slate-900 border border-slate-800 rounded-xl shadow-lg relative p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Archive className="w-6 h-6 text-indigo-400" />
              Rejestr Ofert (Data Grid)
            </h2>
            <span className="bg-slate-800 text-slate-300 py-1 px-3 rounded-md text-xs font-semibold uppercase tracking-wider">
              {opportunities.length} Rekordów
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 uppercase tracking-wider text-xs font-semibold text-slate-400">
                <tr>
                  <th className="p-4 border-b border-slate-800">Tytuł</th>
                  <th className="p-4 border-b border-slate-800">Klient</th>
                  <th className="p-4 border-b border-slate-800 text-center">Data Utworzenia</th>
                  <th className="p-4 border-b border-slate-800 text-center">Status</th>
                  <th className="p-4 border-b border-slate-800 text-right">Wartość</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 bg-slate-900">
                {opportunities.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-500 italic">Brak ofert w rejestrze.</td></tr>
                ) : opportunities.map(opp => (
                  <tr key={opp.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-slate-200">{opp.title}</div>
                      <div className="text-xs text-slate-500 font-mono">ID: {opp.id}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-300">{opp.customer?.name}</div>
                      <div className="text-xs text-slate-500">{opp.customer?.nip}</div>
                    </td>
                    <td className="p-4 text-center text-slate-400">
                      {new Date(opp.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        opp.status === 'ACCEPTED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        opp.status === 'OFFER_SENT' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                        opp.status === 'LOST' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {opp.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-slate-200 tabular-nums">
                      {formatValue(opp.value, opp.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* WYSKAKUJĄCA SZUFLADA Z FORMULARZEM NOWEGO LEADA (Drawer) */}
      <NewLeadDrawer
        isOpen={isLeadDrawerOpen}
        onClose={() => setIsLeadDrawerOpen(false)}
        onSuccess={() => {
          setIsLeadDrawerOpen(false);
          fetchOpportunities();
        }}
      />
    </div>
  );
}
