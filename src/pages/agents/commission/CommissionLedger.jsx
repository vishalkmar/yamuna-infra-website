import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../../lib/api';
import { useToast } from '../../../components/Toast';
import PageHeader from '../../../components/PageHeader';
import DataTable from '../../../components/DataTable';
import Pagination from '../../../components/Pagination';
import StatCard from '../../../components/StatCard';
import StatusBadge from '../../../components/StatusBadge';
import FormModal, { Field, inputClass } from '../../../components/FormModal';
import { fmtMoney, fmtDate } from '../../../lib/format';

const STATUSES = ['accrued', 'approved', 'paid', 'reversed'];
const FILTERS = [{ key: '', label: 'All' }, ...STATUSES.map(s => ({ key: s, label: s }))];

export default function CommissionLedger() {
  const navigate = useNavigate();
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [agents, setAgents] = useState([]);
  const [adjOpen, setAdjOpen] = useState(false);
  const [adj, setAdj] = useState({ agentId: '', amount: 0, notes: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, pageSize: 20 };
      if (status) params.status = status;
      if (agentFilter) params.agentId = agentFilter;
      const { data: res } = await api.get('/admin/commission/ledger', { params });
      setData(res.data);
    } catch (e) { toast.error(apiError(e, 'Could not load ledger')); } finally { setLoading(false); }
  }, [page, status, agentFilter, toast]);

  const loadStats = useCallback(async () => {
    try { const { data } = await api.get('/admin/commission/ledger/stats'); setStats(data.data); } catch { /* */ }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { setPage(1); }, [status, agentFilter]);
  useEffect(() => { api.get('/admin/agents', { params: { pageSize: 100 } }).then(r => setAgents(r.data.data.rows)).catch(() => {}); }, []);

  async function changeStatus(r, newStatus) {
    try { await api.post(`/admin/commission/ledger/${r.id}/status`, { status: newStatus }); toast.success('Updated'); load(); loadStats(); }
    catch (e) { toast.error(apiError(e)); }
  }

  async function submitAdj() {
    if (!adj.agentId) { toast.error('Pick an agent'); return; }
    setBusy(true);
    try {
      await api.post('/admin/commission/ledger/adjust', { agentId: Number(adj.agentId), amount: Number(adj.amount) || 0, notes: adj.notes || null });
      toast.success('Adjustment added'); setAdjOpen(false); setAdj({ agentId: '', amount: 0, notes: '' }); load(); loadStats();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const columns = [
    { key: 'agentName', header: 'Agent', render: r => r.agentName || '—' },
    { key: 'buyerName', header: 'Booking', render: r => r.buyerName || (r.ruleSnapshot === 'Manual adjustment' ? '(adjustment)' : '—') },
    { key: 'dealValue', header: 'Deal', render: r => r.dealValue ? fmtMoney(r.dealValue) : '—' },
    { key: 'amount', header: 'Commission', render: r => <span className="font-semibold text-brand-primary">{fmtMoney(r.amount)}</span> },
    { key: 'ruleSnapshot', header: 'Rule', render: r => <span className="text-xs text-slate-500">{r.ruleSnapshot || '—'}</span> },
    {
      key: 'status', header: 'Status',
      render: r => (
        <select value={r.status} onChange={e => changeStatus(r, e.target.value)} className="text-xs border border-slate-300 rounded px-1.5 py-1">
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      ),
    },
    { key: 'createdAt', header: 'Date', render: r => fmtDate(r.createdAt) },
  ];

  return (
    <div>
      <PageHeader title="Commission Ledger" subtitle={`${data.total} entr${data.total === 1 ? 'y' : 'ies'}`}>
        <button onClick={() => navigate('/agents/commission')} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50">Rules</button>
        <button onClick={() => setAdjOpen(true)} className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90">+ Adjustment</button>
      </PageHeader>

      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <StatCard label="Accrued" value={fmtMoney(stats.accrued)} icon="⏳" />
          <StatCard label="Approved" value={fmtMoney(stats.approved)} icon="✅" />
          <StatCard label="Paid" value={fmtMoney(stats.paid)} icon="💰" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)} className={`${inputClass} w-auto`}>
          <option value="">All agents</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setStatus(f.key)} className={`px-3 py-1.5 rounded-lg text-sm border capitalize transition ${status === f.key ? 'bg-brand-primary text-white border-brand-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>{f.label}</button>
          ))}
        </div>
      </div>

      <DataTable columns={columns} rows={data.rows} loading={loading} empty="No commission entries yet. Approve a booking to accrue one." />
      <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />

      <FormModal open={adjOpen} title="Manual adjustment" onClose={() => setAdjOpen(false)} onSubmit={submitAdj} submitting={busy} submitLabel="Add">
        <Field label="Agent" required><select className={inputClass} value={adj.agentId} onChange={e => setAdj(a => ({ ...a, agentId: e.target.value }))}><option value="">— Select —</option>{agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
        <Field label="Amount (₹)" hint="Negative for a clawback"><input type="number" className={inputClass} value={adj.amount} onChange={e => setAdj(a => ({ ...a, amount: e.target.value }))} /></Field>
        <Field label="Notes"><input className={inputClass} value={adj.notes} onChange={e => setAdj(a => ({ ...a, notes: e.target.value }))} /></Field>
      </FormModal>
    </div>
  );
}
