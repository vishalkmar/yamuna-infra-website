import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import SearchBar from '../../components/SearchBar';
import DataTable from '../../components/DataTable';
import { fmtMoney } from '../../lib/format';

const money = v => (v == null ? '—' : fmtMoney ? fmtMoney(v) : '₹' + Number(v).toLocaleString('en-IN'));

export default function PaymentPlanList() {
  const navigate = useNavigate();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/payment-plan/properties', { params: search ? { search } : {} });
      setRows(data.data);
    } catch (e) {
      toast.error(apiError(e, 'Could not load properties'));
    } finally { setLoading(false); }
  }, [search, toast]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    { key: 'residentName', header: 'Resident', render: r => <span className="font-medium text-slate-800">{r.residentName || '—'}</span> },
    {
      key: 'flatNo', header: 'Property',
      render: r => (
        <div>
          <div className="text-slate-800">{r.label || r.flatNo || 'Property'}</div>
          <div className="text-xs text-slate-400">{[r.projectName, r.tower && `Tower ${r.tower}`, r.flatNo].filter(Boolean).join(' · ')}</div>
        </div>
      ),
    },
    { key: 'totalAmount', header: 'Agreement', render: r => money(r.totalAmount) },
    { key: 'totalPaid', header: 'Paid', render: r => <span className="text-emerald-700">{money(r.totalPaid)}</span> },
    { key: 'outstanding', header: 'Outstanding', render: r => <span className="text-rose-600">{money(r.outstanding)}</span> },
    {
      key: 'overdueCount', header: 'Status',
      render: r => r.totalAmount == null
        ? <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">No plan</span>
        : r.overdueCount > 0
          ? <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">{r.overdueCount} overdue</span>
          : <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">On track</span>,
    },
  ];

  return (
    <div>
      <PageHeader title="Payments & Plan" subtitle="Per-property installment plans, payments & statements" />
      <div className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search resident, project, flat…" />
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        empty="No properties yet. Add a resident with a property first."
        actions={r => (
          <button onClick={() => navigate(`/payment-plan/${r.id}`)} className="text-brand-primary font-semibold hover:underline">Manage</button>
        )}
      />
    </div>
  );
}
