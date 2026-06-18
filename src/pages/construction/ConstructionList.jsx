import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import SearchBar from '../../components/SearchBar';
import DataTable from '../../components/DataTable';

function Bar({ pct }) {
  return (
    <div className="flex items-center gap-2 w-40">
      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full bg-brand-primary" style={{ width: `${pct || 0}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-600 w-9 text-right">{pct || 0}%</span>
    </div>
  );
}

export default function ConstructionList() {
  const navigate = useNavigate();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/construction/properties', { params: search ? { search } : {} });
      setRows(data.data);
    } catch (e) {
      toast.error(apiError(e, 'Could not load properties'));
    } finally {
      setLoading(false);
    }
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
    { key: 'workStatus', header: 'Target', render: r => (
      <span className="text-xs">
        <span className={`px-2 py-0.5 rounded-full ${r.workStatus === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {r.workStatus === 'completed' ? 'Completed' : 'Expected'}
        </span>
      </span>
    ) },
    { key: 'workPercent', header: 'Progress', render: r => <Bar pct={r.workPercent} /> },
    { key: 'stepCount', header: 'Steps', render: r => `${r.stepCount || 0}` },
    { key: 'updateCount', header: 'Updates', render: r => `${r.updateCount || 0}` },
  ];

  return (
    <div>
      <PageHeader title="Construction System" subtitle="Per-property progress, steps & weekly updates" />
      <div className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search resident, project, flat…" />
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        empty="No properties yet. Add a resident with a property first."
        actions={r => (
          <button onClick={() => navigate(`/construction/${r.id}`)} className="text-brand-primary font-semibold hover:underline">
            Manage
          </button>
        )}
      />
    </div>
  );
}
