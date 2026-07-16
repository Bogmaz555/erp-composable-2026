'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Sty', Maszyny: 1, Podzespoły: 20 },
  { name: 'Lut', Maszyny: 2, Podzespoły: 35 },
  { name: 'Mar', Maszyny: 4, Podzespoły: 48 },
  { name: 'Kwi', Maszyny: 5, Podzespoły: 62 },
  { name: 'Maj', Maszyny: 8, Podzespoły: 95 },
  { name: 'Cze', Maszyny: 7, Podzespoły: 86 },
];

export function DashboardCharts() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 600, fontSize: 12}} dy={10} />
        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 600, fontSize: 12}} dx={-10} />
        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'}} />
        <Legend wrapperStyle={{paddingTop: '20px', fontSize: '14px', fontWeight: 500}} />
        <Bar dataKey="Podzespoły" stackId="a" fill="#cbd5e1" radius={[0, 0, 8, 8]} barSize={40} />
        <Bar dataKey="Maszyny" stackId="a" fill="#6366f1" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
