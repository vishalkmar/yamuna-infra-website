import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useToast } from './Toast';
import DataTable from './DataTable';
import { apiError } from '../lib/api';
import { fmtMoney } from '../lib/format';

const METRICS = [
  { key: 'dealValue', label: 'Sales value' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'commission', label: 'Commission' },
];
const PERIODS = [
  { key: 'all', label: 'All time' },
  { key: 'month', label: 'This month' },
  { key: 'year', label: 'This year' },
];

function periodRange(key) {
  const now = new Date();
  const iso = d => d.toISOString().slice(0, 10);
  if (key === 'month') return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) };
  if (key === 'year') return { from: iso(new Date(now.getFullYear(), 0, 1)), to: iso(now) };
  return {};
}

const medal = r => (r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : `#${r}`);

// Shared leaderboard. `fetcher(params)` → rows. `highlightId` outlines the
// current agent's row.
export default function Leaderboard({ fetcher, highlightId }) {
  const toast = useToast();
  const [metric, setMetric] = useState('dealValue');
  const [period, setPeriod] = useState('all');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = periodRange(period);
      const data = await fetcher({ metric, from, to });
      setRows(data);
    } catch (e) { toast.error(apiError(e, 'Could not load leaderboard')); } finally { setLoading(false); }
  }, [metric, period, fetcher, toast]);

  useEffect(() => { load(); }, [load]);

  const columns = useMemo(() => [
    { key: 'rank', header: 'Rank', render: r => <span className="font-bold">{medal(r.rank)}</span> },
    {
      key: 'agentName', header: 'Agent',
      render: r => (
        <div className={String(r.agentId) === String(highlightId) ? 'font-bold text-brand-primary' : ''}>
          {r.agentName}{String(r.agentId) === String(highlightId) ? ' (you)' : ''}
          {r.companyName ? <div className="text-xs text-slate-400 font-normal">{r.companyName}</div> : null}
        </div>
      ),
    },
    { key: 'bookings', header: 'Bookings', render: r => r.bookings },
    { key: 'dealValue', header: 'Sales value', render: r => fmtMoney(r.dealValue) },
    { key: 'commission', header: 'Commission', render: r => fmtMoney(r.commission) },
  ], [highlightId]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex flex-wrap gap-1">
          {METRICS.map(m => (
            <button key={m.key} onClick={() => setMetric(m.key)} className={`px-3 py-1.5 rounded-lg text-sm border transition ${metric === m.key ? 'bg-brand-primary text-white border-brand-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>{m.label}</button>
          ))}
        </div>
        <span className="text-slate-300">·</span>
        <div className="flex flex-wrap gap-1">
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)} className={`px-3 py-1.5 rounded-lg text-sm border transition ${period === p.key ? 'bg-slate-700 text-white border-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>{p.label}</button>
          ))}
        </div>
      </div>
      <DataTable columns={columns} rows={rows} loading={loading} rowKey="agentId" empty="No ranked agents yet." />
    </div>
  );
}
