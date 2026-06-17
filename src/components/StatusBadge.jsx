import React from 'react';

// Colored status pill. Maps common statuses to colors; unknown → slate.
const MAP = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-slate-100 text-slate-600',
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
  paid: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-rose-100 text-rose-700',
  refunded: 'bg-violet-100 text-violet-700',
  booked: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  preparing: 'bg-amber-100 text-amber-700',
  out: 'bg-blue-100 text-blue-700',
};

export default function StatusBadge({ status, children }) {
  const key = String(status ?? '').toLowerCase();
  const cls = MAP[key] || 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${cls}`}>
      {children ?? status ?? '—'}
    </span>
  );
}
