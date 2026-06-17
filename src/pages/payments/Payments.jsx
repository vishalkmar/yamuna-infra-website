import React, { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import SearchBar from '../../components/SearchBar';
import ConfirmDialog from '../../components/ConfirmDialog';
import StatCard from '../../components/StatCard';
import { fmtMoney, fmtDateTime } from '../../lib/format';

const STATUSES = ['', 'success', 'failed', 'refunded'];

export default function Payments() {
  const toast = useToast();
  const [filters, setFilters] = useState({ status: '', method: '', from: '', to: '', search: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0, pageSize: 20, summary: null, methods: [] });
  const [loading, setLoading] = useState(true);
  const [refund, setRefund] = useState(null);
  const [busy, setBusy] = useState(false);

  const queryParams = useCallback(() => {
    const p = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) p[k] = v; });
    return p;
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/admin/payments', { params: { ...queryParams(), page, pageSize: 20 } });
      setData(res.data);
    } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [queryParams, page, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [filters]);

  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  async function doRefund() {
    setBusy(true);
    try {
      await api.post(`/admin/payments/${refund.id}/refund`);
      toast.success('Payment refunded');
      setRefund(null); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function exportCsv() {
    try {
      const res = await api.get('/admin/payments/export.csv', { params: queryParams(), responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = 'payments.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error(apiError(e, 'Export failed')); }
  }

  const columns = [
    { key: 'txnId', header: 'Txn', render: r => (
      <div><div className="font-medium text-slate-800">{r.txnId}</div><div className="text-xs text-slate-400">{r.bookingCode} · {r.unit || '—'}</div></div>
    ) },
    { key: 'userName', header: 'Resident', render: r => (
      <div><div className="text-slate-700">{r.userName || '—'}</div><div className="text-xs text-slate-400">{r.userMobile}</div></div>
    ) },
    { key: 'installmentLabel', header: 'For', render: r => r.installmentLabel || r.remarks || '—' },
    { key: 'method', header: 'Method' },
    { key: 'amount', header: 'Amount', align: 'right', render: r => <span className="font-semibold">{fmtMoney(r.amount)}</span> },
    { key: 'paidAt', header: 'Paid', render: r => fmtDateTime(r.paidAt) },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status} /> },
  ];

  const s = data.summary;

  return (
    <div>
      <PageHeader title="Payments & Reports" subtitle={`${data.total} transaction${data.total === 1 ? '' : 's'}`} actionLabel="⬇ Export CSV" onAction={exportCsv} />

      {s && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
          <StatCard label="Successful" value={fmtMoney(s.success.amount)} icon="✅" hint={`${s.success.count} txns`} />
          <StatCard label="Refunded" value={fmtMoney(s.refunded.amount)} icon="↩️" hint={`${s.refunded.count} txns`} />
          <StatCard label="Failed" value={s.failed.count} icon="⚠️" hint="transactions" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchBar value={filters.search} onChange={v => setF('search', v)} placeholder="Txn / booking / unit…" />
        <select value={filters.method} onChange={e => setF('method', e.target.value)} className="text-sm border border-slate-300 rounded-lg px-3 py-2">
          <option value="">All methods</option>
          {data.methods.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <input type="date" value={filters.from} onChange={e => setF('from', e.target.value)} className="text-sm border border-slate-300 rounded-lg px-3 py-2" title="From" />
        <input type="date" value={filters.to} onChange={e => setF('to', e.target.value)} className="text-sm border border-slate-300 rounded-lg px-3 py-2" title="To" />
        <div className="flex gap-1">
          {STATUSES.map(st => (
            <button key={st || 'all'} onClick={() => setF('status', st)} className={`px-3 py-1.5 rounded-lg text-sm border capitalize transition ${filters.status === st ? 'bg-brand-primary text-white border-brand-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
              {st || 'All'}
            </button>
          ))}
        </div>
      </div>

      <DataTable columns={columns} rows={data.rows} loading={loading} empty="No transactions"
        actions={r => (r.status === 'success' ? (
          <button onClick={() => setRefund(r)} className="text-rose-600 hover:underline">Refund</button>
        ) : <span className="text-slate-300">—</span>)}
      />
      <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />

      <ConfirmDialog
        open={!!refund}
        title="Refund this payment?"
        message={refund ? `${refund.txnId} — ${fmtMoney(refund.amount)} will be marked refunded.` : ''}
        confirmLabel="Refund"
        danger
        busy={busy}
        onCancel={() => setRefund(null)}
        onConfirm={doRefund}
      />
    </div>
  );
}
