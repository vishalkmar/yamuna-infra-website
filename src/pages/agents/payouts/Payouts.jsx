import React, { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../../../lib/api';
import { useToast } from '../../../components/Toast';
import PageHeader from '../../../components/PageHeader';
import DataTable from '../../../components/DataTable';
import Pagination from '../../../components/Pagination';
import StatCard from '../../../components/StatCard';
import StatusBadge from '../../../components/StatusBadge';
import FormModal, { Field, inputClass } from '../../../components/FormModal';
import { fmtMoney, fmtDate } from '../../../lib/format';

const STATUSES = ['requested', 'approved', 'processing', 'paid', 'rejected'];
const FILTERS = [{ key: '', label: 'All' }, ...STATUSES.map(s => ({ key: s, label: s }))];

export default function Payouts() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [agents, setAgents] = useState([]);
  const [detail, setDetail] = useState(null);
  const [payModal, setPayModal] = useState(null); // payout being marked paid
  const [payForm, setPayForm] = useState({ method: '', txnRef: '', tdsPercent: 5 });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, pageSize: 20 };
      if (status) params.status = status;
      if (agentFilter) params.agentId = agentFilter;
      const { data: res } = await api.get('/admin/payouts', { params });
      setData(res.data);
    } catch (e) { toast.error(apiError(e, 'Could not load payouts')); } finally { setLoading(false); }
  }, [page, status, agentFilter, toast]);

  const loadStats = useCallback(async () => {
    try { const { data } = await api.get('/admin/payouts/stats'); setStats(data.data); } catch { /* */ }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { setPage(1); }, [status, agentFilter]);
  useEffect(() => { api.get('/admin/agents', { params: { pageSize: 100 } }).then(r => setAgents(r.data.data.rows)).catch(() => {}); }, []);

  async function setPayoutStatus(r, newStatus, extra = {}) {
    try { await api.post(`/admin/payouts/${r.id}/status`, { status: newStatus, ...extra }); toast.success('Updated'); load(); loadStats(); }
    catch (e) { toast.error(apiError(e)); }
  }

  async function openDetail(r) {
    try { const { data } = await api.get(`/admin/payouts/${r.id}`); setDetail(data.data); }
    catch (e) { toast.error(apiError(e)); }
  }

  async function submitPaid() {
    setBusy(true);
    try {
      await api.post(`/admin/payouts/${payModal.id}/status`, { status: 'paid', method: payForm.method || null, txnRef: payForm.txnRef || null, tdsPercent: payForm.tdsPercent === '' ? null : Number(payForm.tdsPercent) });
      toast.success('Marked paid'); setPayModal(null); setPayForm({ method: '', txnRef: '', tdsPercent: 5 }); load(); loadStats();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function downloadStatement(r) {
    try {
      const res = await api.get(`/admin/payouts/${r.id}/statement.pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = `payout-${r.id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error(apiError(e, 'Download failed')); }
  }

  const columns = [
    { key: 'agentName', header: 'Agent', render: r => r.agentName || '—' },
    { key: 'amount', header: 'Amount', render: r => <span className="font-semibold text-brand-primary">{fmtMoney(r.amount)}</span> },
    { key: 'net', header: 'Net', render: r => fmtMoney(r.net) },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status === 'paid' ? 'paid' : r.status === 'rejected' ? 'cancelled' : r.status === 'approved' ? 'approved' : 'pending'}>{r.status}</StatusBadge> },
    { key: 'createdAt', header: 'Requested', render: r => fmtDate(r.createdAt) },
  ];

  return (
    <div>
      <PageHeader title="Payouts" subtitle={`${data.total} payout${data.total === 1 ? '' : 's'}`} />

      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <StatCard label="Pending value" value={fmtMoney(stats.pending)} icon="⏳" />
          <StatCard label="Paid value" value={fmtMoney(stats.paid)} icon="🏦" />
          <StatCard label="New requests" value={stats.requestedCount} icon="🔔" />
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

      <DataTable
        columns={columns}
        rows={data.rows}
        loading={loading}
        empty="No payout requests yet."
        actions={r => (
          <div className="flex items-center gap-3">
            <button onClick={() => openDetail(r)} className="text-slate-600 font-semibold hover:underline">View</button>
            <button onClick={() => downloadStatement(r)} className="text-slate-600 font-semibold hover:underline">PDF</button>
            {r.status === 'requested' && <button onClick={() => setPayoutStatus(r, 'approved')} className="text-emerald-600 font-semibold hover:underline">Approve</button>}
            {(r.status === 'requested' || r.status === 'approved') && <button onClick={() => setPayoutStatus(r, 'rejected', { reason: 'Rejected by admin' })} className="text-rose-600 font-semibold hover:underline">Reject</button>}
            {(r.status === 'approved' || r.status === 'processing') && <button onClick={() => { setPayModal(r); setPayForm({ method: '', txnRef: '' }); }} className="text-brand-primary font-semibold hover:underline">Mark paid</button>}
          </div>
        )}
      />
      <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />

      {/* Detail drawer */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setDetail(null)}>
          <div className="bg-white h-full w-full max-w-md flex flex-col shadow-xl animate-[slideIn_.18s_ease]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800">Payout #{detail.id} — {detail.agentName}</h3>
              <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-slate-700 text-lg">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="flex items-center justify-between mb-3">
                <StatusBadge status={detail.status === 'paid' ? 'paid' : detail.status}>{detail.status}</StatusBadge>
                <span className="font-bold text-brand-primary">{fmtMoney(detail.amount)}</span>
              </div>
              {detail.txnRef && <p className="text-sm text-slate-500 mb-3">Txn: {detail.txnRef} ({detail.method || '—'})</p>}
              <h4 className="font-semibold text-slate-700 text-sm mb-2">Commission entries ({detail.items?.length || 0})</h4>
              <div className="space-y-2">
                {(detail.items || []).map(it => (
                  <div key={it.id} className="flex justify-between text-sm border border-slate-100 rounded-lg p-2">
                    <span className="text-slate-600">{it.buyerName || it.ruleSnapshot}</span>
                    <span className="font-medium">{fmtMoney(it.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <FormModal open={!!payModal} title="Mark payout paid" onClose={() => setPayModal(null)} onSubmit={submitPaid} submitting={busy} submitLabel="Mark paid">
        {payModal && <p className="text-sm text-slate-500">Gross {fmtMoney(payModal.amount)} · TDS {payForm.tdsPercent || 0}% = {fmtMoney((Number(payModal.amount) || 0) * (Number(payForm.tdsPercent) || 0) / 100)} · Net {fmtMoney((Number(payModal.amount) || 0) * (1 - (Number(payForm.tdsPercent) || 0) / 100))}</p>}
        <Field label="TDS %"><input type="number" step="0.01" className={inputClass} value={payForm.tdsPercent} onChange={e => setPayForm(f => ({ ...f, tdsPercent: e.target.value }))} /></Field>
        <Field label="Method"><input className={inputClass} placeholder="NEFT / UPI / Cheque" value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))} /></Field>
        <Field label="Transaction ref"><input className={inputClass} value={payForm.txnRef} onChange={e => setPayForm(f => ({ ...f, txnRef: e.target.value }))} /></Field>
      </FormModal>
    </div>
  );
}
