import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import { fmtMoney, fmtDateTime } from '../../lib/format';

const STATUSES = ['placed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
const LABEL = { placed: 'Placed', preparing: 'Preparing', out_for_delivery: 'Out for delivery', delivered: 'Delivered', cancelled: 'Cancelled' };

export default function FoodOrders() {
  const navigate = useNavigate();
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState(null); // { order, list }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, pageSize: 20 };
      if (status) params.status = status;
      const { data: res } = await api.get('/admin/food/orders', { params });
      setData(res.data);
    } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [page, status, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status]);

  async function changeStatus(order, newStatus) {
    try {
      await api.put(`/admin/food/orders/${order.id}/status`, { status: newStatus });
      toast.success(`Order #${order.id} → ${LABEL[newStatus]}`);
      load();
    } catch (e) { toast.error(apiError(e)); }
  }

  async function viewItems(order) {
    try {
      const { data } = await api.get(`/admin/food/orders/${order.id}/items`);
      setItems({ order, list: data.data });
    } catch (e) { toast.error(apiError(e)); }
  }

  const columns = [
    { key: 'id', header: 'Order', render: r => <span className="font-semibold text-slate-700">#{r.id}</span> },
    { key: 'userName', header: 'Resident', render: r => (
      <div><div className="font-medium text-slate-800">{r.userName || '—'}</div><div className="text-xs text-slate-400">{r.userMobile}</div></div>
    ) },
    { key: 'itemCount', header: 'Items', render: r => <button onClick={() => viewItems(r)} className="text-brand-primary hover:underline">{r.itemCount} item(s)</button> },
    { key: 'total', header: 'Total', render: r => fmtMoney(r.total) },
    { key: 'createdAt', header: 'Placed', render: r => fmtDateTime(r.createdAt) },
    { key: 'status', header: 'Status', render: r => (
      <select value={r.status} onChange={e => changeStatus(r, e.target.value)} className="text-sm border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
        {STATUSES.map(s => <option key={s} value={s}>{LABEL[s]}</option>)}
      </select>
    ) },
  ];

  return (
    <div>
      <button onClick={() => navigate('/food')} className="text-sm text-slate-500 hover:text-slate-700 mb-3">← Back to food</button>
      <PageHeader title="Food Orders" subtitle={`${data.total} order${data.total === 1 ? '' : 's'}`} />

      <div className="flex flex-wrap gap-1 mb-4">
        {['', ...STATUSES].map(s => (
          <button key={s || 'all'} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-lg text-sm border transition ${status === s ? 'bg-brand-primary text-white border-brand-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
            {s ? LABEL[s] : 'All'}
          </button>
        ))}
      </div>

      <DataTable columns={columns} rows={data.rows} loading={loading} empty="No orders yet" />
      <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />

      {items && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setItems(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800">Order #{items.order.id}</h3>
              <button onClick={() => setItems(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            <ul className="divide-y divide-slate-100">
              {items.list.map(i => (
                <li key={i.id} className="py-2 flex justify-between text-sm">
                  <span className="text-slate-700">{i.name} × {i.qty}</span>
                  <span className="text-slate-500">{fmtMoney(Number(i.price) * i.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between font-semibold text-slate-800 mt-3 pt-3 border-t border-slate-100">
              <span>Total</span><span>{fmtMoney(items.order.total)}</span>
            </div>
            {items.order.deliveryNote && <p className="text-xs text-slate-400 mt-2">Note: {items.order.deliveryNote}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
