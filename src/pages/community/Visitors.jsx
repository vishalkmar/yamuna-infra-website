import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import { fmtDate } from '../../lib/format';

const STATUSES = ['active', 'used', 'expired', 'revoked'];
const LABEL = { active: 'Active', used: 'Used', expired: 'Expired', revoked: 'Revoked' };

export default function Visitors() {
  const navigate = useNavigate();
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0, pageSize: 20 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, pageSize: 20 };
      if (status) params.status = status;
      const { data: res } = await api.get('/admin/visitors', { params });
      setData(res.data);
    } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [page, status, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status]);

  async function changeStatus(v, newStatus) {
    try {
      await api.put(`/admin/visitors/${v.id}/status`, { status: newStatus });
      toast.success(`Pass #${v.id} → ${LABEL[newStatus]}`);
      load();
    } catch (e) { toast.error(apiError(e)); }
  }

  const columns = [
    { key: 'guestName', header: 'Guest', render: r => (
      <div><div className="font-medium text-slate-800">{r.guestName}</div><div className="text-xs text-slate-400">{r.guestPhone}</div></div>
    ) },
    { key: 'userName', header: 'Host (resident)', render: r => (
      <div><div className="text-slate-700">{r.userName || '—'}</div><div className="text-xs text-slate-400">{r.userMobile}</div></div>
    ) },
    { key: 'visitPurpose', header: 'Purpose', render: r => <span className="capitalize">{r.visitPurpose || '—'}</span> },
    { key: 'visitDate', header: 'Visit', render: r => fmtDate(r.visitDate) },
    { key: 'vehicleNo', header: 'Vehicle', render: r => r.vehicleNo || '—' },
    { key: 'status', header: 'Status', render: r => (
      <div className="flex items-center gap-2">
        <StatusBadge status={r.status === 'revoked' ? 'rejected' : r.status === 'active' ? 'active' : 'inactive'}>{LABEL[r.status]}</StatusBadge>
        {r.status === 'active' && <button onClick={() => changeStatus(r, 'revoked')} className="text-rose-600 text-xs hover:underline">Revoke</button>}
        {r.status === 'revoked' && <button onClick={() => changeStatus(r, 'active')} className="text-emerald-600 text-xs hover:underline">Restore</button>}
      </div>
    ) },
  ];

  return (
    <div>
      <button onClick={() => navigate('/community')} className="text-sm text-slate-500 hover:text-slate-700 mb-3">← Back to community</button>
      <PageHeader title="Visitor Passes" subtitle={`${data.total} pass${data.total === 1 ? '' : 'es'}`} />

      <div className="flex flex-wrap gap-1 mb-4">
        {['', ...STATUSES].map(s => (
          <button key={s || 'all'} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-lg text-sm border transition ${status === s ? 'bg-brand-primary text-white border-brand-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
            {s ? LABEL[s] : 'All'}
          </button>
        ))}
      </div>

      <DataTable columns={columns} rows={data.rows} loading={loading} empty="No visitor passes yet" />
      <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
    </div>
  );
}
