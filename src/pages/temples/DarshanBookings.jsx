import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import { fmtDate } from '../../lib/format';

const STATUSES = ['', 'booked', 'completed', 'cancelled'];

export default function DarshanBookings() {
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
      const { data: res } = await api.get('/admin/darshan/bookings', { params });
      setData(res.data);
    } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [page, status, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status]);

  const columns = [
    { key: 'bookingCode', header: 'Code', render: r => <span className="font-semibold text-slate-700">{r.bookingCode}</span> },
    { key: 'userName', header: 'Resident', render: r => (
      <div><div className="font-medium text-slate-800">{r.userName || '—'}</div><div className="text-xs text-slate-400">{r.userMobile}</div></div>
    ) },
    { key: 'temples', header: 'Temples', render: r => <span className="text-slate-600">{r.temples || '—'}</span> },
    { key: 'visitDate', header: 'Visit', render: r => fmtDate(r.visitDate) },
    { key: 'persons', header: 'Persons' },
    { key: 'isVip', header: 'VIP', render: r => (r.isVip ? '👑' : '—') },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <button onClick={() => navigate('/temples')} className="text-sm text-slate-500 hover:text-slate-700 mb-3">← Back to temples</button>
      <PageHeader title="Darshan Bookings" subtitle={`${data.total} booking${data.total === 1 ? '' : 's'}`} />

      <div className="flex flex-wrap gap-1 mb-4">
        {STATUSES.map(s => (
          <button key={s || 'all'} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-lg text-sm border capitalize transition ${status === s ? 'bg-brand-primary text-white border-brand-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <DataTable columns={columns} rows={data.rows} loading={loading} empty="No darshan bookings yet" />
      <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
    </div>
  );
}
