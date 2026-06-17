import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import Pagination from '../../components/Pagination';
import SearchBar from '../../components/SearchBar';
import { fmtDateTime } from '../../lib/format';

const ACTIONS = ['', 'POST', 'PUT', 'PATCH', 'DELETE'];
const ACTION_COLOR = { POST: 'bg-emerald-100 text-emerald-700', PUT: 'bg-amber-100 text-amber-700', PATCH: 'bg-amber-100 text-amber-700', DELETE: 'bg-rose-100 text-rose-700' };

export default function AuditLog() {
  const toast = useToast();
  const [filters, setFilters] = useState({ entity: '', action: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0, pageSize: 30 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, pageSize: 30 };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const { data: res } = await api.get('/admin/audit', { params });
      setData(res.data);
    } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [page, filters, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [filters]);
  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  const columns = [
    { key: 'createdAt', header: 'When', render: r => fmtDateTime(r.createdAt) },
    { key: 'adminName', header: 'Admin', render: r => <span className="font-medium text-slate-800">{r.adminName || `#${r.adminId}`}</span> },
    { key: 'action', header: 'Action', render: r => <span className={`text-xs font-semibold px-2 py-0.5 rounded ${ACTION_COLOR[r.action] || 'bg-slate-100 text-slate-600'}`}>{r.action}</span> },
    { key: 'entity', header: 'Entity', render: r => <code className="text-xs text-slate-600">{r.entity}{r.entityId ? `/${r.entityId}` : ''}</code> },
    { key: 'statusCode', header: 'Status', render: r => r.statusCode },
  ];

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle={`${data.total} change${data.total === 1 ? '' : 's'} recorded`}>
        <Link to="/audit/admins" className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">Manage admins</Link>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchBar value={filters.entity} onChange={v => setF('entity', v)} placeholder="Entity (e.g. services)…" />
        <div className="flex gap-1">
          {ACTIONS.map(a => (
            <button key={a || 'all'} onClick={() => setF('action', a)} className={`px-3 py-1.5 rounded-lg text-sm border transition ${filters.action === a ? 'bg-brand-primary text-white border-brand-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
              {a || 'All'}
            </button>
          ))}
        </div>
        <input type="date" value={filters.from} onChange={e => setF('from', e.target.value)} className="text-sm border border-slate-300 rounded-lg px-3 py-2" title="From" />
        <input type="date" value={filters.to} onChange={e => setF('to', e.target.value)} className="text-sm border border-slate-300 rounded-lg px-3 py-2" title="To" />
      </div>

      <DataTable columns={columns} rows={data.rows} loading={loading} empty="No changes recorded yet" />
      <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
    </div>
  );
}
