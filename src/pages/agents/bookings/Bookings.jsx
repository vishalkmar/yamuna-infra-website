import React, { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../../../lib/api';
import { useToast } from '../../../components/Toast';
import PageHeader from '../../../components/PageHeader';
import SearchBar from '../../../components/SearchBar';
import DataTable from '../../../components/DataTable';
import Pagination from '../../../components/Pagination';
import StatCard from '../../../components/StatCard';
import StatusBadge from '../../../components/StatusBadge';
import BookingDocsModal from '../../../components/BookingDocsModal';
import FormModal, { Field, inputClass } from '../../../components/FormModal';
import { fmtMoney, fmtDate } from '../../../lib/format';

const STATUSES = ['pending', 'approved', 'cancelled'];
const FILTERS = [{ key: '', label: 'All' }, ...STATUSES.map(s => ({ key: s, label: s }))];

export default function Bookings() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [agents, setAgents] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, pageSize: 20 };
      if (search) params.search = search;
      if (status) params.status = status;
      if (agentFilter) params.agentId = agentFilter;
      const { data: res } = await api.get('/admin/bookings', { params });
      setData(res.data);
    } catch (e) { toast.error(apiError(e, 'Could not load bookings')); } finally { setLoading(false); }
  }, [page, search, status, agentFilter, toast]);

  const loadStats = useCallback(async () => {
    try { const { data } = await api.get('/admin/bookings/stats'); setStats(data.data); } catch { /* */ }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { setPage(1); }, [search, status, agentFilter]);
  useEffect(() => { api.get('/admin/agents', { params: { pageSize: 100 } }).then(r => setAgents(r.data.data.rows)).catch(() => {}); }, []);

  async function approve(r) {
    try { await api.post(`/admin/bookings/${r.id}/approve`); toast.success('Approved'); load(); loadStats(); }
    catch (e) { toast.error(apiError(e)); }
  }
  async function exportCsv() {
    try {
      const params = {};
      if (search) params.search = search;
      if (status) params.status = status;
      if (agentFilter) params.agentId = agentFilter;
      const res = await api.get('/admin/bookings/export.csv', { params, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url; a.download = 'agent-bookings.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error(apiError(e, 'Export failed')); }
  }

  async function pushToResident(r) {
    try { const { data } = await api.post(`/admin/bookings/${r.id}/link`); toast.success(data.message || 'Linked'); load(); }
    catch (e) { toast.error(apiError(e)); }
  }
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelBusy, setCancelBusy] = useState(false);
  async function submitCancel() {
    setCancelBusy(true);
    try { await api.post(`/admin/bookings/${cancelTarget.id}/cancel`, { reason: cancelReason }); toast.success('Cancelled'); setCancelTarget(null); setCancelReason(''); load(); loadStats(); }
    catch (e) { toast.error(apiError(e)); } finally { setCancelBusy(false); }
  }

  // ---- documents ----
  const [docsBooking, setDocsBooking] = useState(null);
  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const loadDocs = useCallback(async (id) => {
    setDocsLoading(true);
    try { const { data } = await api.get(`/admin/bookings/${id}/documents`); setDocs(data.data); }
    catch (e) { toast.error(apiError(e)); } finally { setDocsLoading(false); }
  }, [toast]);
  function openDocs(r) { setDocsBooking(r); loadDocs(r.id); }
  async function addDoc(payload) { try { await api.post(`/admin/bookings/${docsBooking.id}/documents`, payload); loadDocs(docsBooking.id); } catch (e) { toast.error(apiError(e)); } }
  async function delDoc(d) { try { await api.delete(`/admin/bookings/documents/${d.id}`); loadDocs(docsBooking.id); } catch (e) { toast.error(apiError(e)); } }

  const columns = [
    { key: 'buyerName', header: 'Buyer', render: r => (<div><div className="font-medium text-slate-800">{r.buyerName}</div><div className="text-xs text-slate-400">{r.buyerPhone || ''}</div></div>) },
    { key: 'agentName', header: 'Agent', render: r => r.agentName || '—' },
    { key: 'projectName', header: 'Project', render: r => r.projectName ? `${r.projectName}${r.unitNo ? ' · ' + r.unitNo : ''}` : '—' },
    { key: 'dealValue', header: 'Deal', render: r => fmtMoney(r.dealValue) },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status === 'approved' ? 'approved' : r.status === 'cancelled' ? 'cancelled' : 'pending'}>{r.status}</StatusBadge> },
    { key: 'linked', header: 'Resident', render: r => r.linkedUserId ? <span className="text-xs text-emerald-600 font-semibold">✔ linked</span> : '—' },
    { key: 'createdAt', header: 'Created', render: r => fmtDate(r.createdAt) },
  ];

  return (
    <div>
      <PageHeader title="Agent Bookings" subtitle={`${data.total} booking${data.total === 1 ? '' : 's'}`}>
        <button onClick={exportCsv} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50">Export CSV</button>
      </PageHeader>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
          <StatCard label="Total" value={stats.total} icon="🧾" />
          <StatCard label="Pending" value={stats.pending} icon="⏳" />
          <StatCard label="Approved" value={stats.approved} icon="✅" />
          <StatCard label="Cancelled" value={stats.cancelled} icon="✖" />
          <StatCard label="Approved value" value={fmtMoney(stats.approvedValue)} icon="💰" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search buyer name / phone…" />
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

      <DataTable
        columns={columns}
        rows={data.rows}
        loading={loading}
        empty="No bookings yet."
        actions={r => (
          <div className="flex items-center gap-3">
            {r.status === 'pending' && <button onClick={() => approve(r)} className="text-emerald-600 font-semibold hover:underline">Approve</button>}
            {r.status === 'approved' && !r.linkedUserId && <button onClick={() => pushToResident(r)} className="text-brand-primary font-semibold hover:underline">Push to resident</button>}
            <button onClick={() => openDocs(r)} className="text-slate-600 font-semibold hover:underline">Docs</button>
            {r.status !== 'cancelled' && !r.linkedUserId && <button onClick={() => { setCancelTarget(r); setCancelReason(''); }} className="text-rose-600 font-semibold hover:underline">Cancel</button>}
          </div>
        )}
      />
      <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />

      <FormModal open={!!cancelTarget} title={`Cancel booking — ${cancelTarget?.buyerName || ''}`} onClose={() => setCancelTarget(null)} onSubmit={submitCancel} submitting={cancelBusy} submitLabel="Cancel booking">
        <p className="text-sm text-slate-500">The unit will be released back to available for re-booking.</p>
        <Field label="Reason"><textarea className={inputClass} rows={3} value={cancelReason} onChange={e => setCancelReason(e.target.value)} /></Field>
      </FormModal>

      <BookingDocsModal
        open={!!docsBooking}
        title={docsBooking ? `Documents — ${docsBooking.buyerName}` : 'Documents'}
        docs={docs}
        loading={docsLoading}
        onClose={() => setDocsBooking(null)}
        onAdd={addDoc}
        onDelete={delDoc}
      />
    </div>
  );
}
