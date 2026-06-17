import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { fmtDate } from '../../lib/format';

export default function FoodTiffin() {
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/admin/food/subscriptions'); setRows(data.data); }
    catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    { key: 'userName', header: 'Resident', render: r => (
      <div><div className="font-medium text-slate-800">{r.userName || '—'}</div><div className="text-xs text-slate-400">{r.userMobile}</div></div>
    ) },
    { key: 'plan', header: 'Plan', render: r => <span className="capitalize">{r.plan}</span> },
    { key: 'dietType', header: 'Diet', render: r => <span className="capitalize">{r.dietType}</span> },
    { key: 'persons', header: 'Persons' },
    { key: 'startDate', header: 'Start', render: r => fmtDate(r.startDate) },
    { key: 'nextRenewal', header: 'Renews', render: r => fmtDate(r.nextRenewal) },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <button onClick={() => navigate('/food')} className="text-sm text-slate-500 hover:text-slate-700 mb-3">← Back to food</button>
      <PageHeader title="Tiffin Subscriptions" subtitle={`${rows.length} subscription${rows.length === 1 ? '' : 's'}`} />
      <DataTable columns={columns} rows={rows} loading={loading} empty="No tiffin subscriptions yet" />
    </div>
  );
}
