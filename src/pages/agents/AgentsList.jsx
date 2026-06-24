import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import SearchBar from '../../components/SearchBar';
import DataTable from '../../components/DataTable';
import Pagination from '../../components/Pagination';
import StatusBadge from '../../components/StatusBadge';
import StatCard from '../../components/StatCard';
import AgentFormModal from './AgentFormModal';
import { fmtDate } from '../../lib/format';

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'active', label: 'Active' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'rejected', label: 'Rejected' },
];

const TYPE_LABEL = {
  channel_partner: 'Channel Partner',
  broker: 'Broker',
  in_house: 'In-house',
  freelancer: 'Freelancer',
};

function Avatar({ url, name }) {
  if (url) return <img src={url} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" />;
  return (
    <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary grid place-items-center text-xs font-bold">
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

export default function AgentsList() {
  const navigate = useNavigate();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, pageSize: 20 };
      if (search) params.search = search;
      if (status) params.status = status;
      const { data: res } = await api.get('/admin/agents', { params });
      setData(res.data);
    } catch (e) {
      toast.error(apiError(e, 'Could not load agents'));
    } finally {
      setLoading(false);
    }
  }, [page, search, status, toast]);

  const loadStats = useCallback(async () => {
    try {
      const { data: res } = await api.get('/admin/agents/stats');
      setStats(res.data);
    } catch { /* non-blocking */ }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { setPage(1); }, [search, status]);

  const columns = [
    {
      key: 'name',
      header: 'Agent',
      render: r => (
        <div className="flex items-center gap-2">
          <Avatar url={r.photoUrl} name={r.name} />
          <div>
            <div className="font-medium text-slate-800">{r.name || '—'}</div>
            <div className="text-xs text-slate-400">{r.referralCode || ''}</div>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', render: r => r.phone || '—' },
    { key: 'email', header: 'Email', render: r => <span className="text-slate-600">{r.email}</span> },
    { key: 'agentType', header: 'Type', render: r => TYPE_LABEL[r.agentType] || r.agentType },
    { key: 'tierName', header: 'Tier', render: r => r.tierName || '—' },
    { key: 'kycStatus', header: 'KYC', render: r => <StatusBadge status={r.kycStatus}>{r.kycStatus}</StatusBadge> },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status}>{r.status}</StatusBadge> },
    { key: 'createdAt', header: 'Added', render: r => fmtDate(r.createdAt) },
  ];

  return (
    <div>
      <PageHeader title="Agents (Channel Partners)" subtitle={`${data.total} agent${data.total === 1 ? '' : 's'}`}>
        <button onClick={() => navigate('/agents/tiers')} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          Tiers
        </button>
        <button onClick={() => setFormOpen(true)} className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90">
          + Add agent
        </button>
      </PageHeader>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
          <StatCard label="Total" value={stats.total} icon="🤝" />
          <StatCard label="Active" value={stats.active} icon="✅" />
          <StatCard label="Pending" value={stats.pending} icon="⏳" />
          <StatCard label="Suspended" value={stats.suspended} icon="⛔" />
          <StatCard label="KYC Pending" value={stats.kycPending} icon="📋" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search name, email, phone, company, code…" />
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                status === f.key ? 'bg-brand-primary text-white border-brand-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >{f.label}</button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={data.rows}
        loading={loading}
        empty="No agents yet. Click “Add agent”, or wait for partners to self-register."
        actions={r => (
          <button onClick={() => navigate(`/agents/${r.id}`)} className="text-brand-primary font-semibold hover:underline">View</button>
        )}
      />
      <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />

      <AgentFormModal
        open={formOpen}
        mode="create"
        onClose={() => setFormOpen(false)}
        onSaved={() => { setFormOpen(false); load(); loadStats(); }}
      />
    </div>
  );
}
