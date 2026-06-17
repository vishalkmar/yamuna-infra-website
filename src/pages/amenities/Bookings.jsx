import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import Pagination from '../../components/Pagination';
import { fmtDate } from '../../lib/format';

const STATUSES = ['booked', 'completed', 'cancelled'];
const LABEL = { booked: 'Booked', completed: 'Completed', cancelled: 'Cancelled' };

export default function AmenityBookings() {
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
      const { data: res } = await api.get('/admin/amenities/bookings/all', { params });
      setData(res.data);
    } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [page, status, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status]);

  async function changeStatus(b, newStatus) {
    try {
      await api.put(`/admin/amenities/bookings/${b.id}/status`, { status: newStatus });
      toast.success(`${b.bookingCode} → ${LABEL[newStatus]}`);
      load();
    } catch (e) { toast.error(apiError(e)); }
  }

  const columns = [
    { key: 'bookingCode', header: 'Code', render: r => <span className="font-semibold text-slate-700">{r.bookingCode}</span> },
    { key: 'userName', header: 'Resident', render: r => (
      <div><div className="font-medium text-slate-800">{r.userName || '—'}</div><div className="text-xs text-slate-400">{r.userMobile}</div></div>
    ) },
    { key: 'amenityName', header: 'Facility', render: r => <span>{r.amenityIcon} {r.amenityName || '—'}</span> },
    { key: 'bookingDate', header: 'Date', render: r => fmtDate(r.bookingDate) },
    { key: 'timeSlot', header: 'Slot' },
    { key: 'occasion', header: 'Occasion', render: r => r.occasion || '—' },
    { key: 'status', header: 'Status', render: r => (
      <select value={r.status} onChange={e => changeStatus(r, e.target.value)} className="text-sm border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
        {STATUSES.map(s => <option key={s} value={s}>{LABEL[s]}</option>)}
      </select>
    ) },
  ];

  return (
    <div>
      <button onClick={() => navigate('/amenities')} className="text-sm text-slate-500 hover:text-slate-700 mb-3">← Back to amenities</button>
      <PageHeader title="Amenity Bookings" subtitle={`${data.total} booking${data.total === 1 ? '' : 's'}`} />

      <div className="flex flex-wrap gap-1 mb-4">
        {['', ...STATUSES].map(s => (
          <button key={s || 'all'} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-lg text-sm border transition ${status === s ? 'bg-brand-primary text-white border-brand-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
            {s ? LABEL[s] : 'All'}
          </button>
        ))}
      </div>

      <DataTable columns={columns} rows={data.rows} loading={loading} empty="No bookings yet" />
      <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
    </div>
  );
}
