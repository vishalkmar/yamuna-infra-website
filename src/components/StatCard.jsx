import React from 'react';

// Dashboard KPI tile.
export default function StatCard({ label, value, icon, hint }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-extrabold text-brand-primary">{value ?? '—'}</div>
        {icon && <div className="text-2xl opacity-80">{icon}</div>}
      </div>
      <div className="text-sm text-slate-500 mt-1">{label}</div>
      {hint && <div className="text-xs text-slate-400 mt-0.5">{hint}</div>}
    </div>
  );
}
