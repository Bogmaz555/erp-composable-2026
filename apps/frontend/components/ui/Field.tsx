"use client";

import React from 'react';

const baseInput =
  'bg-slate-950/60 border border-slate-800 focus:border-blue-500/70 p-2.5 rounded-lg text-sm text-slate-200 outline-none transition-colors shadow-inner w-full';
const baseLabel = 'text-[10px] font-bold tracking-widest text-slate-400 uppercase ml-0.5';

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={baseLabel}>{label}</label>
      {children}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${baseInput} ${props.className ?? ''}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`${baseInput} appearance-none cursor-pointer ${props.className ?? ''}`}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${baseInput} ${props.className ?? ''}`} />;
}
