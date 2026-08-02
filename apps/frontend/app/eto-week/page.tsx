'use client';

/**
 * Enterprise Q4 — ETO week path without CLI.
 * Links existing module routes; uses gateway + bearer from localStorage/session.
 */
import Link from 'next/link';

const STEPS = [
  {
    n: 1,
    title: 'PLM — BOM / Items',
    href: '/plm',
    desc: 'Release BOM version (SoR: PLM)',
  },
  {
    n: 2,
    title: 'PM — Project & materials',
    href: '/pm',
    desc: 'Project, WBS, material request',
  },
  {
    n: 3,
    title: 'INV — Reserve stock',
    href: '/inv',
    desc: 'Reservations / lot (SoR: INV)',
  },
  {
    n: 4,
    title: 'MES — Work orders',
    href: '/mes',
    desc: 'Start/finish WO, genealogy',
  },
  {
    n: 5,
    title: 'Finance — WIP / journal',
    href: '/finance',
    desc: 'WIP cost, period, compensations',
  },
  {
    n: 6,
    title: 'Documents (DMS)',
    href: '/settings',
    desc: 'Versioned project documents',
  },
];

export default function EtoWeekPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2">ETO Week Path</h1>
        <p className="text-slate-400 text-sm mb-8">
          Enterprise Q4 — complete manufacturing week without CLI. Use gateway JWT
          (login). Order is fixed by SoR map.
        </p>
        <ol className="space-y-4">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="border border-slate-800 rounded-xl p-4 hover:border-blue-500/40 transition-colors"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 text-sm font-bold">
                  {s.n}
                </span>
                <div className="flex-1">
                  <Link href={s.href} className="text-lg font-medium text-blue-300 hover:underline">
                    {s.title}
                  </Link>
                  <p className="text-slate-500 text-sm mt-1">{s.desc}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-xs text-slate-600">
          Auth: all /api/* except health require bearer (enterprise). Search: ⌘K
          (GlobalSearch).
        </p>
      </div>
    </main>
  );
}
