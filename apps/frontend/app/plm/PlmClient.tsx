'use client';

import React, { useState } from 'react';
import { 
  Network, 
  Settings2, 
  Wrench, 
  Cpu, 
  CheckCircle2, 
  Lock, 
  Unlock, 
  Edit3, 
  AlertOctagon, 
  FileBox, 
  HardDriveDownload, 
  Loader2, 
  Search,
  ChevronRight,
  ChevronDown,
  Activity
} from 'lucide-react';

export type BomStatus = 'DRAFT' | 'APPROVED';

export interface BomNode {
  id: string;
  name: string;
  partNumber: string;
  revision: string;
  status: BomStatus;
  quantity: number;
  material?: string;
  children?: BomNode[];
}

export default function PlmClient() {
  const [isImporting, setIsImporting] = useState(false);
  const [bomData, setBomData] = useState<BomNode[]>([]);
  const [ecoLogs, setEcoLogs] = useState<{ id: string; timestamp: Date; message: string; targetId: string }[]>([]);

  const handleImportCAD = () => {
    setIsImporting(true);
    setBomData([]); 
    
    setTimeout(() => {
      // Potężne złoże testowe po 2 sekundach ładowania
      const mockData: BomNode[] = [
        {
          id: 'ROOT-100',
          name: 'System Napędowy Głównej Osi',
          partNumber: 'DRV-1000-MAIN',
          revision: 'Rev B',
          status: 'DRAFT',
          quantity: 1,
          material: 'Złożenie',
          children: [
            {
              id: 'SUB-101',
              name: 'Silnik Serwo 5kW',
              partNumber: 'MOT-SRV-5K',
              revision: 'Rev A',
              status: 'DRAFT',
              quantity: 1,
              material: 'Podzespół',
              children: [
                { id: 'PRT-101-1', name: 'Obudowa Silnika', partNumber: 'CAS-101', revision: 'Rev A', status: 'DRAFT', quantity: 1, material: 'Aluminium 6061' },
                { id: 'PRT-101-2', name: 'Stojan z uzwojeniem', partNumber: 'STT-102', revision: 'Rev B', status: 'DRAFT', quantity: 1, material: 'Miedź/Stal' },
                { id: 'PRT-101-3', name: 'Rotor magnetyczny', partNumber: 'ROT-103', revision: 'Rev A', status: 'DRAFT', quantity: 1, material: 'NdFeB/Stal' },
                { id: 'PRT-101-4', name: 'Wał wyjściowy 24mm', partNumber: 'SHF-104', revision: 'Rev C', status: 'DRAFT', quantity: 1, material: 'Stal 42CrMo4' }
              ]
            },
            {
              id: 'SUB-102',
              name: 'Przekładnia Planetarna',
              partNumber: 'GBX-PLN-15',
              revision: 'Rev A',
              status: 'DRAFT',
              quantity: 1,
              material: 'Podzespół',
              children: [
                { id: 'PRT-102-1', name: 'Korpus główny frezowany', partNumber: 'GBX-BDY', revision: 'Rev B', status: 'DRAFT', quantity: 1, material: 'Stal nierdzewna 304' },
                { id: 'PRT-102-2', name: 'Koło słoneczne', partNumber: 'SUN-GR', revision: 'Rev A', status: 'DRAFT', quantity: 1, material: 'Stal utwardzana' },
                { id: 'PRT-102-3', name: 'Satelity reduktora', partNumber: 'SAT-GR', revision: 'Rev A', status: 'DRAFT', quantity: 3, material: 'Stal utwardzana' },
                { id: 'PRT-102-4', name: 'Łożyska stożkowe', partNumber: 'BRG-TP-40', revision: 'Rev A', status: 'APPROVED', quantity: 2, material: 'Stal łożyskowa' }
              ]
            },
            {
              id: 'SUB-103',
              name: 'Moduł Sprzęgła Bezpieczeństwa',
              partNumber: 'CLT-SAF-X',
              revision: 'Rev D',
              status: 'APPROVED',
              quantity: 1,
              material: 'Podzespół',
              children: [
                { id: 'PRT-103-1', name: 'Tarcza sprzęgła', partNumber: 'CLT-DSC', revision: 'Rev D', status: 'APPROVED', quantity: 1, material: 'Kompozyt ceramiczny' },
                { id: 'PRT-103-2', name: 'Piasta mocująca', partNumber: 'CLT-HUB', revision: 'Rev B', status: 'APPROVED', quantity: 1, material: 'Aluminium 7075' },
                { id: 'PRT-103-3', name: 'Śruba zaciskowa M8x40', partNumber: 'FAS-M8X40', revision: 'Rev A', status: 'APPROVED', quantity: 6, material: 'Stal 8.8 (Klasa)' }
              ]
            }
          ]
        }
      ];
      setBomData(mockData);
      setIsImporting(false);
    }, 2000);
  };

  const approveNodeRecursive = (nodes: BomNode[], targetId: string, recursiveApprove = false): { updated: BomNode[], found: boolean } => {
    let foundInLevel = false;
    const updated = nodes.map(node => {
      if (node.id === targetId || recursiveApprove) {
        foundInLevel = node.id === targetId || foundInLevel;
        const newStatus: BomStatus = 'APPROVED';
        return {
          ...node,
          status: newStatus,
          children: node.children ? approveNodeRecursive(node.children, targetId, true).updated : undefined
        };
      }
      
      if (node.children) {
        const { updated: childNodes, found } = approveNodeRecursive(node.children, targetId, recursiveApprove);
        if (found) {
          foundInLevel = true;
          return { ...node, children: childNodes };
        }
      }
      return node;
    });

    return { updated, found: foundInLevel };
  };

  const handlePartialRelease = (targetId: string) => {
    const { updated } = approveNodeRecursive(bomData, targetId, false);
    setBomData(updated);
  };

  const handleEditBOM = (node: BomNode) => {
    if (node.status === 'APPROVED') {
      const newEcoLog = {
        id: `ECO-${Math.floor(Math.random() * 10000)}`,
        timestamp: new Date(),
        message: `Blokada Edycji: Odmowa dostępu do ${node.partNumber} (${node.name}). Wymagane wygenerowanie wniosku ECO celem de-relizacj bazy.`,
        targetId: node.id
      };
      setEcoLogs(prev => [newEcoLog, ...prev]);
    } else {
      // Modal would open here in real scenario
    }
  };

  return (
    <div className="p-8 sm:p-12 font-[family-name:var(--font-geist-sans)] min-h-screen bg-[#070B14] text-slate-100 flex flex-col relative w-full overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-[0%] left-[20%] w-[40%] h-[40%] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[20%] right-[-10%] w-[30%] h-[50%] bg-purple-600/10 blur-[150px] rounded-full pointer-events-none"></div>

      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6 z-10 w-full border-b border-slate-700/50 pb-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 drop-shadow-lg flex items-center">
            <Network className="w-10 h-10 mr-4 text-blue-500" />
            Engineering & PLM
          </h1>
          <p className="text-slate-400 mt-2 text-lg font-medium tracking-wide">
            Zarządzanie strukturą wyrobów (BOM), Integracja CAD i Zatwierdzenia.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handleImportCAD}
            disabled={isImporting}
            className={`flex items-center gap-3 px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-sm transition-all shadow-lg ${
              isImporting 
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]'
            }`}
          >
            {isImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <HardDriveDownload className="w-5 h-5" />}
            {isImporting ? 'Pobieranie złoża CAD...' : 'Importuj z SolidWorks'}
          </button>
        </div>
      </header>

      <div className="flex-1 flex gap-8 z-10 overflow-hidden min-h-[650px]">
        {/* L E F T   C O L U M N  (BOM TREE) */}
        <div className="w-3/4 bg-slate-900/60 rounded-3xl border border-slate-700/50 shadow-2xl flex flex-col backdrop-blur-md overflow-hidden relative">
          
          {/* Drzewo Header */}
          <div className="h-16 flex items-center px-6 border-b border-slate-700 bg-slate-800/80 shrink-0">
             <div className="flex-1 font-bold text-slate-300 tracking-wider">KOMPONENT / OZNACZENIE</div>
             <div className="w-32 font-bold text-slate-300 tracking-wider text-center">ILOŚĆ</div>
             <div className="w-48 font-bold text-slate-300 tracking-wider text-center">REWIZJA</div>
             <div className="w-40 font-bold text-slate-300 tracking-wider text-center">DOPUSZCZENIE</div>
             <div className="w-16 font-bold text-slate-300 tracking-wider text-center">AKCJE</div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
            {isImporting && (
               <div className="flex flex-col items-center justify-center h-full text-blue-400">
                  <Activity className="w-16 h-16 animate-pulse mb-6 opacity-60" />
                  <p className="text-xl font-bold tracking-widest uppercase opacity-80 animate-pulse">Synchronizacja Drzewa Mechaniki...</p>
               </div>
            )}

            {!isImporting && bomData.length === 0 && (
               <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <FileBox className="w-16 h-16 mb-4 opacity-30" />
                  <p className="text-lg font-bold tracking-widest uppercase opacity-50">Brak aktywnego złoża BOM</p>
                  <p className="text-sm opacity-40 mt-2">Użyj integracji CAD2BOM aby rozpocząć proces inżynieryjny.</p>
               </div>
            )}

            {!isImporting && bomData.map(node => (
              <BomTreeRow 
                key={node.id} 
                node={node} 
                depth={0} 
                onPartialRelease={handlePartialRelease}
                onEdit={handleEditBOM}
              />
            ))}
          </div>

        </div>

        {/* R I G H T   C O L U M N  (ECO PANEL) */}
        <div className="w-1/4 bg-slate-900/60 rounded-3xl border border-slate-700/50 shadow-2xl flex flex-col backdrop-blur-md overflow-hidden">
          <div className="h-16 flex items-center px-6 border-b border-slate-700 bg-slate-800/80 shrink-0">
             <Wrench className="w-5 h-5 mr-3 text-rose-400" />
             <h2 className="font-bold text-slate-100 tracking-wider text-lg">Panel ECO</h2>
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto no-scrollbar space-y-4">
             {ecoLogs.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-center text-slate-500 font-medium px-4">
                  Brak aktywnych wniosków Engineering Change Order.
                </div>
             ) : (
                ecoLogs.map(log => (
                  <div key={log.id} className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 shadow-[0_0_15px_rgba(225,29,72,0.05)] animate-in slide-in-from-right-4 fade-in">
                    <div className="flex justify-between items-center border-b border-rose-500/20 pb-2 mb-3">
                      <span className="text-rose-400 font-bold tracking-wider">{log.id}</span>
                      <span className="text-xs text-rose-300 opacity-60 font-mono">{log.timestamp.toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {log.message}
                    </p>
                    <button className="mt-4 w-full bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 font-bold py-2 rounded-lg transition-colors border border-rose-500/40 text-xs uppercase tracking-widest">
                      Otwórz Formatkę ECO
                    </button>
                  </div>
                ))
             )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// RECURSIVE ROW COMPONENT
// ----------------------------------------------------------------------------

function BomTreeRow({ 
  node, 
  depth, 
  onPartialRelease, 
  onEdit 
}: { 
  node: BomNode, 
  depth: number,
  onPartialRelease: (id: string) => void,
  onEdit: (node: BomNode) => void
}) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isApproved = node.status === 'APPROVED';

  return (
    <div className="flex flex-col">
      <div 
        className={`flex items-center h-16 px-6 border-b border-slate-800/40 hover:bg-slate-800/60 transition-all ${
          isApproved ? 'bg-emerald-900/10' : ''
        }`}
      >
        <div 
          className="flex-1 flex items-center overflow-hidden"
          style={{ paddingLeft: `${depth * 32}px` }}
        >
           {hasChildren ? (
             <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-6 h-6 flex items-center justify-center mr-3 hover:bg-slate-700 rounded transition-colors text-slate-400"
             >
                {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5"/>}
             </button>
           ) : (
             <div className="w-6 mr-3 flex justify-center items-center">
                <div className="w-1.5 h-1.5 bg-slate-600 rounded-full"></div>
             </div>
           )}

           <div className={`p-2 rounded-lg mr-4 ${depth === 0 ? 'bg-blue-500/20 text-blue-400' : depth === 1 ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700/40 text-slate-400'}`}>
              <Cpu className="w-5 h-5" />
           </div>

           <div className="flex flex-col truncate">
              <span className={`font-bold text-lg tracking-wide truncate ${isApproved ? 'text-emerald-50' : 'text-slate-200'}`}>
                {node.name}
              </span>
              <span className="text-sm text-slate-500 font-mono tracking-widest">{node.partNumber} &bull; {node.material}</span>
           </div>
        </div>

        {/* Ilość */}
        <div className="w-32 flex justify-center items-center font-bold text-slate-300 text-lg">
           {node.quantity}
        </div>

        {/* Rewizja */}
        <div className="w-48 flex justify-center items-center">
          <span className="bg-slate-800 border border-slate-600 px-3 py-1 rounded text-sm font-bold tracking-widest text-slate-300">
            {node.revision}
          </span>
        </div>

        {/* Status / Release */}
        <div className="w-40 flex justify-center items-center">
            {isApproved ? (
              <span className="flex items-center text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                 <Lock className="w-4 h-4 mr-2" />
                 <span className="text-xs font-bold uppercase tracking-widest">Zatwierdz.</span>
              </span>
            ) : (
              <button 
                onClick={() => onPartialRelease(node.id)}
                className="flex items-center text-slate-400 hover:text-emerald-400 bg-slate-800 hover:bg-emerald-500/10 hover:border-emerald-500/30 border border-slate-700 px-3 py-1.5 rounded-lg transition-all group"
              >
                 <Unlock className="w-4 h-4 mr-2 group-hover:hidden" />
                 <CheckCircle2 className="w-4 h-4 mr-2 hidden group-hover:block" />
                 <span className="text-xs font-bold uppercase tracking-widest">Do Zakupu</span>
              </button>
            )}
        </div>

        {/* Akcje */}
        <div className="w-16 flex justify-center items-center">
            <button 
              onClick={() => onEdit(node)}
              className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
               <Edit3 className="w-5 h-5" />
            </button>
        </div>
      </div>

      {hasChildren && isOpen && (
        <div className="flex flex-col">
          {node.children!.map(child => (
            <BomTreeRow 
              key={child.id} 
              node={child} 
              depth={depth + 1} 
              onPartialRelease={onPartialRelease}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
