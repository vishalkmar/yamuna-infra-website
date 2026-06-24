import React, { useEffect, useState, useCallback } from 'react';
import agentApi, { apiError } from '../../lib/agentApi';
import { useToast } from '../../components/Toast';
import { useAgentAuth } from '../../context/AgentAuthContext';
import SearchBar from '../../components/SearchBar';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { fmtMoney } from '../../lib/format';

// Agent read-only inventory browse: project cards → click → available units.
export default function AgentInventory() {
  const toast = useToast();
  const { agent } = useAgentAuth();
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [units, setUnits] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await agentApi.get('/agent/projects', { params: search ? { search } : {} });
      setProjects(data.data);
    } catch (e) { toast.error(apiError(e, 'Could not load projects')); } finally { setLoading(false); }
  }, [search, toast]);

  useEffect(() => { load(); }, [load]);

  const loadUnits = useCallback(async (projectId) => {
    setUnitsLoading(true);
    try {
      const { data } = await agentApi.get(`/agent/projects/${projectId}/units`);
      setUnits(data.data);
    } catch (e) { toast.error(apiError(e, 'Could not load units')); } finally { setUnitsLoading(false); }
  }, [toast]);

  const openProject = useCallback((p) => { setSelected(p); loadUnits(p.id); }, [loadUnits]);

  async function holdUnit(u) {
    try { await agentApi.post(`/agent/projects/units/${u.id}/hold`); toast.success('Held for 48 hours'); loadUnits(selected.id); }
    catch (e) { toast.error(apiError(e)); }
  }
  async function releaseUnit(u) {
    try { await agentApi.post(`/agent/projects/units/${u.id}/release`); toast.success('Hold released'); loadUnits(selected.id); }
    catch (e) { toast.error(apiError(e)); }
  }

  const unitColumns = [
    { key: 'unitNo', header: 'Unit', render: u => <span className="font-medium text-slate-800">{u.unitNo}</span> },
    { key: 'towerName', header: 'Tower', render: u => u.towerName || '—' },
    { key: 'floor', header: 'Floor', render: u => u.floor || '—' },
    { key: 'unitType', header: 'Type', render: u => u.unitType || '—' },
    { key: 'areaSqft', header: 'Area', render: u => u.areaSqft ? `${u.areaSqft} sqft` : '—' },
    { key: 'facing', header: 'Facing', render: u => u.facing || '—' },
    { key: 'basePrice', header: 'Price', render: u => fmtMoney(u.basePrice) },
    {
      key: 'status', header: 'Status',
      render: u => <StatusBadge status={u.status}>{String(u.heldByAgentId) === String(agent?.id) && u.status === 'held' ? 'held by you' : u.status}</StatusBadge>,
    },
  ];

  const unitActions = u => {
    if (u.status === 'available') return <button onClick={() => holdUnit(u)} className="text-amber-600 font-semibold hover:underline">Hold 48h</button>;
    if (u.status === 'held' && String(u.heldByAgentId) === String(agent?.id)) return <button onClick={() => releaseUnit(u)} className="text-emerald-600 font-semibold hover:underline">Release</button>;
    return <span className="text-slate-300">—</span>;
  };

  if (selected) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => { setSelected(null); setUnits([]); }} className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50">← Projects</button>
          <h2 className="text-lg font-bold text-slate-800">{selected.name}</h2>
          <span className="text-sm text-slate-500">{[selected.location, selected.city].filter(Boolean).join(', ')}</span>
        </div>
        <p className="text-sm text-slate-500 mb-3">Available & on-hold units. Hold a unit for 48 hours while you close the buyer.</p>
        <DataTable columns={unitColumns} rows={units} loading={unitsLoading} empty="No available units in this project right now." actions={unitActions} />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-1">Inventory</h2>
      <p className="text-sm text-slate-500 mb-4">Browse live projects and available units to pitch to your buyers.</p>
      <div className="mb-4"><SearchBar value={search} onChange={setSearch} placeholder="Search project, location, city…" /></div>

      {loading ? (
        <div className="text-slate-400">Loading…</div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">No projects available.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <button key={p.id} onClick={() => openProject(p)} className="text-left bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition">
              {p.imageUrl ? <img src={p.imageUrl} alt="" className="w-full h-36 object-cover" /> : <div className="w-full h-36 bg-slate-100 grid place-items-center text-4xl">🏢</div>}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800">{p.name}</h3>
                  <StatusBadge status={p.status}>{p.status}</StatusBadge>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">{[p.location, p.city].filter(Boolean).join(', ') || '—'}</p>
                <div className="flex items-center justify-between mt-3 text-sm">
                  <span className="text-brand-primary font-semibold">{fmtMoney(p.priceFrom)}{p.priceTo ? ' +' : ''}</span>
                  <span className="text-emerald-600 font-semibold">{p.availableCount} available</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
