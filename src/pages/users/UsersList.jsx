import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import SearchBar from '../../components/SearchBar';
import DataTable from '../../components/DataTable';
import Pagination from '../../components/Pagination';
import StatusBadge from '../../components/StatusBadge';
import { fmtDate } from '../../lib/format';

const KYC_FILTERS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'KYC Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'none', label: 'No KYC' },
];

export default function UsersList() {
  const navigate = useNavigate();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [kyc, setKyc] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0, pageSize: 20 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, pageSize: 20 };
      if (search) params.search = search;
      if (kyc) params.kyc = kyc;
      const { data: res } = await api.get('/admin/users', { params });
      setData(res.data);
    } catch (e) {
      toast.error(apiError(e, 'Could not load residents'));
    } finally {
      setLoading(false);
    }
  }, [page, search, kyc, toast]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 when the filters change.
  useEffect(() => { setPage(1); }, [search, kyc]);

  const columns = [
    { key: 'name', header: 'Name', render: r => <span className="font-medium text-slate-800">{r.name || '—'}</span> },
    { key: 'mobile', header: 'Mobile' },
    { key: 'unit', header: 'Unit', render: r => (r.unit ? `${r.unit}${r.tower ? ` · ${r.tower}` : ''}` : '—') },
    { key: 'kycStatus', header: 'KYC', render: r => <StatusBadge status={r.kycStatus} /> },
    { key: 'isActive', header: 'Status', render: r => <StatusBadge status={r.isActive ? 'active' : 'inactive'}>{r.isActive ? 'Active' : 'Blocked'}</StatusBadge> },
    { key: 'createdAt', header: 'Joined', render: r => fmtDate(r.createdAt) },
  ];

  return (
    <div>
      <PageHeader title="Users & Residents" subtitle={`${data.total} resident${data.total === 1 ? '' : 's'}`} />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search name, mobile, email…" />
        <div className="flex flex-wrap gap-1">
          {KYC_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setKyc(f.key)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                kyc === f.key ? 'bg-brand-primary text-white border-brand-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >{f.label}</button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={data.rows}
        loading={loading}
        empty="No residents found"
        actions={r => (
          <button onClick={() => navigate(`/users/${r.id}`)} className="text-brand-primary font-semibold hover:underline">
            View
          </button>
        )}
      />
      <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
    </div>
  );
}
