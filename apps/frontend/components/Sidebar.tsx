"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Users, FileText, Box, Factory, Activity, Wallet, Wrench, Menu, X, Tablet, Landmark, FileStack, BookOpen, HardHat, ShoppingCart, Database, Boxes, Shield
} from 'lucide-react';
import { useState } from 'react';

const MENU_ITEMS = [
  { name: 'Zarząd (BI)', link: '/', icon: <LayoutDashboard className="w-5 h-5" /> },
  { name: 'CRM (Klienci)', link: '/crm', icon: <Users className="w-5 h-5" /> },
  { name: 'PM - Projekty', link: '/pm', icon: <FileText className="w-5 h-5" /> },
  { name: 'INV - Magazyn', link: '/inv', icon: <Box className="w-5 h-5" /> },
  { name: 'PROC - Zaopatrzenie', link: '/proc', icon: <ShoppingCart className="w-5 h-5" /> },
  { name: 'MES - Produkcja', link: '/mes', icon: <Factory className="w-5 h-5" /> },
  { name: 'PLM - Inżynieria', link: '/plm', icon: <Wrench className="w-5 h-5" /> },
  { name: 'Kartoteka Produktów', link: '/products', icon: <Boxes className="w-5 h-5" /> },
  { name: 'QMS - Kontrola Jakości', link: '/quality', icon: <Activity className="w-5 h-5" /> },
  { name: 'EAM - Utrzymanie Ruchu', link: '/eam', icon: <HardHat className="w-5 h-5" /> },
  { name: 'FIN - Finanse', link: '/finance', icon: <Wallet className="w-5 h-5" /> },
  { name: 'HR - Kadry', link: '/hr', icon: <Users className="w-5 h-5" /> },
  { name: 'Tax / KSeF', link: '/tax', icon: <Landmark className="w-5 h-5" /> },
  { name: 'Integracje i Dane', link: '/data-hub', icon: <Database className="w-5 h-5" /> },
  { name: 'Role i uprawnienia', link: '/settings/roles', icon: <Shield className="w-5 h-5" /> },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Toggle */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#0f172a] border-b border-slate-800 z-50 flex items-center px-4 justify-between">
         <div className="flex items-center">
             <span className="font-extrabold text-blue-500 text-xl">ERP System</span>
         </div>
         <button onClick={() => setIsOpen(!isOpen)} className="text-white p-2">
           {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
         </button>
      </div>

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0f172a] text-slate-200 flex flex-col pt-16 md:pt-0 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static`}>
        <div className="hidden md:flex h-20 items-center px-6 shrink-0">
          <span className="font-extrabold text-blue-400 text-2xl tracking-wide">ERP System</span>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scrollbar-none">
          {MENU_ITEMS.map((item) => {
            const isActive = pathname === item.link || (pathname?.startsWith(item.link) && item.link !== '/');
            return (
              <Link href={item.link} key={item.link} onClick={() => setIsOpen(false)}
                className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-800 hover:text-white font-medium'}`}>
                <span className={`mr-4 ${isActive ? 'text-white' : 'text-slate-300'}`}>{item.icon}</span>
                <span className="text-[15px]">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </aside>
      
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden transition-opacity" 
          onClick={() => setIsOpen(false)} 
        />
      )}
    </>
  );
}
