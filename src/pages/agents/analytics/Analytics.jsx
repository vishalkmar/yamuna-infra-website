import React, { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../../../lib/api';
import { useToast } from '../../../components/Toast';
import PageHeader from '../../../components/PageHeader';
import DataTable from '../../../components/DataTable';
import StatCard from '../../../components/StatCard';
import { fmtMoney } from '../../../lib/format';

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

export default function Analytics() {
  const toast = useToast();
  const [tab, setTab] = useState('agents');
  const [period, setPeriod] = useState('all');
  const [funnel, setFunnel] = useState(null);
  const [rows, setRows] = useState([]);
  const [leadData, setLeadData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = periodRange(period);
      if (tab === 'agents') {
        const [f, a] = await Promise.all([
          api.get('/admin/analytics/funnel', { params }),
          api.get('/admin/analytics/agents', { params }),
        ]);
        setFunnel(f.data.data); setRows(a.data.data);
      } else {
        const { data } = await api.get('/admin/analytics/leads', { params });
        setLeadData(data.data);
      }
    } catch (e) { toast.error(apiError(e, 'Could not load analytics')); } finally { setLoading(false); }
  }, [tab, period, toast]);

  useEffect(() => { load(); }, [load]);

  async function exportCsv() {
    try {
      const res = await api.get('/admin/analytics/agents/export.csv', { params: periodRange(period), responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const el = document.createElement('a'); el.href = url; el.download = 'agent-performance.csv'; el.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error(apiError(e, 'Export failed')); }
  }

  const columns = [
    { key: 'agentName', header: 'Agent', render: r => <div><div className="font-medium text-slate-800">{r.agentName}</div>{r.companyName ? <div className="text-xs text-slate-400">{r.companyName}</div> : null}</div> },
    { key: 'leads', header: 'Leads', render: r => r.leads },
    { key: 'visits', header: 'Visits', render: r => r.visits },
    { key: 'bookings', header: 'Bookings', render: r => r.bookings },
    { key: 'approved', header: 'Approved', render: r => r.approved },
    { key: 'conversion', header: 'Conv.', render: r => `${r.conversion}%` },
    { key: 'dealValue', header: 'Sales value', render: r => fmtMoney(r.dealValue) },
    { key: 'commission', header: 'Commission', render: r => fmtMoney(r.commission) },
  ];

  return (
    <div>
      <PageHeader title="Performance Analytics" subtitle="Agent & lead funnel">
        {tab === 'agents' && <button onClick={exportCsv} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50">Export CSV</button>}
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex rounded-lg border border-slate-300 overflow-hidden text-sm">
          <button onClick={() => setTab('agents')} className={`px-3 py-1.5 ${tab === 'agents' ? 'bg-brand-primary text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Agents</button>
          <button onClick={() => setTab('leads')} className={`px-3 py-1.5 ${tab === 'leads' ? 'bg-brand-primary text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Leads</button>
        </div>
        <span className="text-slate-300">·</span>
        {PERIODS.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)} className={`px-3 py-1.5 rounded-lg text-sm border transition ${period === p.key ? 'bg-slate-700 text-white border-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>{p.label}</button>
        ))}
      </div>

      {tab === 'leads' ? (
        leadData ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Total leads" value={leadData.summary.total} icon="📇" />
              <StatCard label="Booked" value={leadData.summary.booked} icon="✅" />
              <StatCard label="Lost" value={leadData.summary.lost} icon="❌" />
              <StatCard label="Conversion" value={`${leadData.summary.conversion}%`} icon="📈" />
            </div>
            <div className="grid lg:grid-cols-3 gap-4">
              <Breakdown title="By stage" rows={leadData.byStage.map(r => ({ label: r.stage, count: r.count }))} />
              <Breakdown title="By source" rows={leadData.bySource.map(r => ({ label: r.source, count: r.count }))} />
              <Breakdown title="Top projects" rows={leadData.byProject.map(r => ({ label: r.projectName, count: r.count }))} />
            </div>
          </div>
        ) : <div className="text-slate-400">Loading…</div>
      ) : (
      <>
      {funnel && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-5">
          <StatCard label="Leads" value={funnel.leads} icon="📇" />
          <StatCard label="Visits" value={funnel.visits} icon="📅" />
          <StatCard label="Bookings" value={funnel.bookings} icon="🧾" />
          <StatCard label="Approved" value={funnel.approved} icon="✅" />
          <StatCard label="Conversion" value={`${funnel.conversion}%`} icon="📈" />
          <StatCard label="Sales value" value={fmtMoney(funnel.dealValue)} icon="💰" />
        </div>
      )}

      <DataTable columns={columns} rows={rows} loading={loading} rowKey="agentId" empty="No data for this period." />
      </>
      )}
    </div>
  );
}

function Breakdown({ title, rows }) {
  const max = Math.max(1, ...rows.map(r => r.count));
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h4 className="font-semibold text-slate-700 mb-3">{title}</h4>
      {rows.length === 0 ? <p className="text-slate-400 text-sm">No data.</p> : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i}>
              <div className="flex justify-between text-sm mb-0.5"><span className="text-slate-600 capitalize">{String(r.label).replace('_', ' ')}</span><span className="font-medium">{r.count}</span></div>
              <div className="h-1.5 rounded bg-slate-100 overflow-hidden"><div className="h-full bg-brand-primary" style={{ width: `${(r.count / max) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
