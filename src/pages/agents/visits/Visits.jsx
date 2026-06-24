import React, { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../../../lib/api';
import { useToast } from '../../../components/Toast';
import PageHeader from '../../../components/PageHeader';
import SearchBar from '../../../components/SearchBar';
import DataTable from '../../../components/DataTable';
import Pagination from '../../../components/Pagination';
import StatCard from '../../../components/StatCard';
import StatusBadge from '../../../components/StatusBadge';
import VisitOutcomeModal from '../../../components/VisitOutcomeModal';
import { inputClass } from '../../../components/FormModal';
import { fmtDateTime, fmtDate } from '../../../lib/format';

const STATUSES = ['requested', 'confirmed', 'completed', 'no_show', 'cancelled'];
const FILTERS = [{ key: '', label: 'All' }, ...STATUSES.map(s => ({ key: s, label: s.replace('_', ' ') }))];

// Group agenda rows by calendar day (YYYY-MM-DD).
function groupByDay(rows) {
  const map = {};
  rows.forEach(r => {
    const key = (r.scheduledAt || '').slice(0, 10);
    (map[key] || (map[key] = [])).push(r);
  });
  return Object.keys(map).sort().map(day => ({ day, items: map[day] }));
}

export default function Visits() {
  const toast = useToast();
  const [view, setView] = useState('list'); // 'list' | 'agenda'
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState([]);
  const [stats, setStats] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: view === 'agenda' ? 1 : page, pageSize: view === 'agenda' ? 200 : 20 };
      if (search) params.search = search;
      if (status) params.status = status;
      if (agentFilter) params.agentId = agentFilter;
      if (date) params.date = date;
      const { data: res } = await api.get('/admin/visits', { params });
      setData(res.data);
    } catch (e) { toast.error(apiError(e, 'Could not load visits')); } finally { setLoading(false); }
  }, [view, page, search, status, agentFilter, date, toast]);

  const loadStats = useCallback(async () => {
    try { const { data } = await api.get('/admin/visits/stats'); setStats(data.data); } catch { /* */ }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { setPage(1); }, [search, status, agentFilter, date, view]);
  useEffect(() => { api.get('/admin/agents', { params: { pageSize: 100 } }).then(r => setAgents(r.data.data.rows)).catch(() => {}); }, []);

  async function changeStatus(r, newStatus) {
    try { await api.post(`/admin/visits/${r.id}/status`, { status: newStatus }); toast.success('Updated'); load(); loadStats(); }
    catch (e) { toast.error(apiError(e)); }
  }
  async function checkIn(r) {
    try { await api.post(`/admin/visits/${r.id}/checkin`); toast.success('Checked in'); load(); }
    catch (e) { toast.error(apiError(e)); }
  }
  const [outcomeVisit, setOutcomeVisit] = useState(null);
  const [outcomeBusy, setOutcomeBusy] = useState(false);
  async function submitOutcome(payload) {
    setOutcomeBusy(true);
    try { await api.post(`/admin/visits/${outcomeVisit.id}/status`, payload); toast.success('Outcome saved'); setOutcomeVisit(null); load(); loadStats(); }
    catch (e) { toast.error(apiError(e)); } finally { setOutcomeBusy(false); }
  }

  const columns = [
    { key: 'leadName', header: 'Lead', render: r => (<div><div className="font-medium text-slate-800">{r.leadName}</div><div className="text-xs text-slate-400">{r.leadPhone || ''}</div></div>) },
    { key: 'agentName', header: 'Agent', render: r => r.agentName || '—' },
    { key: 'projectName', header: 'Project', render: r => r.projectName ? `${r.projectName}${r.unitNo ? ' · ' + r.unitNo : ''}` : '—' },
    { key: 'scheduledAt', header: 'When', render: r => `${fmtDateTime(r.scheduledAt)}${r.slot ? ` · ${r.slot}` : ''}` },
    {
      key: 'status', header: 'Status',
      render: r => (
        <select value={r.status} onChange={e => changeStatus(r, e.target.value)} className="text-xs border border-slate-300 rounded px-1.5 py-1">
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Site Visits" subtitle={`${data.total} visit${data.total === 1 ? '' : 's'}`}>
        <div className="flex rounded-lg border border-slate-300 overflow-hidden text-sm">
          <button onClick={() => setView('list')} className={`px-3 py-1.5 ${view === 'list' ? 'bg-brand-primary text-white' : 'text-slate-600 hover:bg-slate-50'}`}>List</button>
          <button onClick={() => setView('agenda')} className={`px-3 py-1.5 ${view === 'agenda' ? 'bg-brand-primary text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Agenda</button>
        </div>
      </PageHeader>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
          <StatCard label="Total" value={stats.total} icon="📅" />
          <StatCard label="Today" value={stats.today} icon="⭐" />
          <StatCard label="Requested" value={stats.requested} icon="⏳" />
          <StatCard label="Confirmed" value={stats.confirmed} icon="✅" />
          <StatCard label="Completed" value={stats.completed} icon="🏁" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search lead name / phone…" />
        <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)} className={`${inputClass} w-auto`}>
          <option value="">All agents</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className={`${inputClass} w-auto`} />
        <div className="flex flex-wrap gap-1">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setStatus(f.key)} className={`px-3 py-1.5 rounded-lg text-sm border capitalize transition ${status === f.key ? 'bg-brand-primary text-white border-brand-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>{f.label}</button>
          ))}
        </div>
      </div>

      {view === 'list' ? (
        <>
          <DataTable
            columns={columns}
            rows={data.rows}
            loading={loading}
            empty="No site visits yet."
            actions={r => (
              <div className="flex items-center gap-3">
                {r.status === 'requested' && <button onClick={() => changeStatus(r, 'confirmed')} className="text-emerald-600 font-semibold hover:underline">Confirm</button>}
                {(r.status === 'requested' || r.status === 'confirmed') && !r.checkedInAt && <button onClick={() => checkIn(r)} className="text-sky-600 font-semibold hover:underline">Check-in</button>}
                {(r.status === 'requested' || r.status === 'confirmed') && <button onClick={() => setOutcomeVisit(r)} className="text-brand-primary font-semibold hover:underline">Outcome</button>}
                {!['requested', 'confirmed'].includes(r.status) && <span className="text-slate-300">—</span>}
              </div>
            )}
          />
          <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
        </>
      ) : (
        loading ? <div className="text-slate-400">Loading…</div>
          : data.rows.length === 0 ? <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">No visits.</div>
          : (
            <div className="space-y-5">
              {groupByDay(data.rows).map(group => (
                <div key={group.day}>
                  <h3 className="text-sm font-bold text-slate-700 mb-2">{fmtDate(group.day)}</h3>
                  <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {group.items.map(r => (
                      <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-28 text-sm text-slate-600">{fmtDateTime(r.scheduledAt).split(', ').slice(-1)[0]}{r.slot ? '' : ''}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-800 text-sm">{r.leadName} <span className="text-xs text-slate-400">{r.leadPhone || ''}</span></div>
                          <div className="text-xs text-slate-500">{r.agentName || '—'}{r.projectName ? ` · ${r.projectName}${r.unitNo ? ' / ' + r.unitNo : ''}` : ''}{r.slot ? ` · ${r.slot}` : ''}</div>
                        </div>
                        {r.checkedInAt && <span title="Checked in" className="text-sky-600 text-xs">✔ in</span>}
                        <StatusBadge status={r.status}>{r.status}</StatusBadge>
                        {r.status === 'requested' && <button onClick={() => changeStatus(r, 'confirmed')} className="text-emerald-600 text-sm font-semibold hover:underline">Confirm</button>}
                        {(r.status === 'requested' || r.status === 'confirmed') && <button onClick={() => setOutcomeVisit(r)} className="text-brand-primary text-sm font-semibold hover:underline">Outcome</button>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
      )}

      <VisitOutcomeModal open={!!outcomeVisit} busy={outcomeBusy} onClose={() => setOutcomeVisit(null)} onSubmit={submitOutcome} />
    </div>
  );
}
