import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import SearchBar from '../../components/SearchBar';
import DataTable from '../../components/DataTable';
import Pagination from '../../components/Pagination';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import ResidentFormModal from './ResidentFormModal';
import { fmtDate } from '../../lib/format';

const KYC_FILTERS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'KYC Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'none', label: 'No KYC' },
];

function Avatar({ url, name }) {
  if (url) return <img src={url} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" />;
  return (
    <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary grid place-items-center text-xs font-bold">
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

export default function UsersList() {
  const navigate = useNavigate();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [kyc, setKyc] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [busy, setBusy] = useState(false);

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
  useEffect(() => { setPage(1); }, [search, kyc]);

  function openCreate() { setEditTarget(null); setFormOpen(true); }
  function openEdit(row) { setEditTarget(row); setFormOpen(true); }

  async function confirmDelete() {
    setBusy(true);
    try {
      await api.delete(`/admin/users/${delTarget.id}`);
      toast.success('Resident deleted');
      setDelTarget(null);
      load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const columns = [
    {
      key: 'name',
      header: 'Resident',
      render: r => (
        <div className="flex items-center gap-2">
          <Avatar url={r.profilePhoto} name={r.name} />
          <span className="font-medium text-slate-800">{r.name || '—'}</span>
        </div>
      ),
    },
    { key: 'mobile', header: 'Phone' },
    { key: 'email', header: 'Email', render: r => <span className="text-slate-600">{r.email || '—'}</span> },
    { key: 'propertyCount', header: 'Properties', render: r => `${r.propertyCount || 0}` },
    { key: 'isActive', header: 'Status', render: r => <StatusBadge status={r.isActive ? 'active' : 'inactive'}>{r.isActive ? 'Active' : 'Blocked'}</StatusBadge> },
    { key: 'createdAt', header: 'Added', render: r => fmtDate(r.createdAt) },
  ];

  return (
    <div>
      <PageHeader title="Users & Residents" subtitle={`${data.total} resident${data.total === 1 ? '' : 's'}`}>
        <button onClick={openCreate} className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90">
          + Add resident
        </button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search name, phone, email…" />
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
        empty="No residents yet. Click “Add resident” to onboard one."
        actions={r => (
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/users/${r.id}`)} className="text-brand-primary font-semibold hover:underline">View</button>
            <button onClick={() => openEdit(r)} className="text-slate-600 font-semibold hover:underline">Edit</button>
            <button onClick={() => setDelTarget(r)} className="text-rose-600 font-semibold hover:underline">Delete</button>
          </div>
        )}
      />
      <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />

      <ResidentFormModal
        open={formOpen}
        mode={editTarget ? 'edit' : 'create'}
        initial={editTarget}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />

      <ConfirmDialog
        open={!!delTarget}
        title="Delete resident?"
        message={`This permanently removes ${delTarget?.name || 'this resident'} and all their properties. This cannot be undone.`}
        confirmLabel="Delete"
        danger
        busy={busy}
        onCancel={() => setDelTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
