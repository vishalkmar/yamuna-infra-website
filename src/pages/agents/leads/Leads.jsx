import React, { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../../../lib/api';
import { useToast } from '../../../components/Toast';
import PageHeader from '../../../components/PageHeader';
import SearchBar from '../../../components/SearchBar';
import DataTable from '../../../components/DataTable';
import Pagination from '../../../components/Pagination';
import StatCard from '../../../components/StatCard';
import ConfirmDialog from '../../../components/ConfirmDialog';
import FormModal, { Field, inputClass } from '../../../components/FormModal';
import LeadTasksModal from '../../../components/LeadTasksModal';
import LeadActivityModal from '../../../components/LeadActivityModal';
import { fmtMoney, fmtDate } from '../../../lib/format';

const STAGES = [
  { value: 'new', label: 'New' }, { value: 'contacted', label: 'Contacted' },
  { value: 'site_visit', label: 'Site Visit' }, { value: 'negotiation', label: 'Negotiation' },
  { value: 'booked', label: 'Booked' }, { value: 'lost', label: 'Lost' },
];
const SOURCES = [
  { value: 'walk_in', label: 'Walk-in' }, { value: 'referral', label: 'Referral' },
  { value: 'online', label: 'Online' }, { value: 'call', label: 'Call' },
  { value: 'social', label: 'Social' }, { value: 'other', label: 'Other' },
];
const STAGE_FILTERS = [{ value: '', label: 'All' }, ...STAGES];
const empty = { agentId: '', name: '', phone: '', email: '', source: 'other', projectId: '', unitId: '', budget: 0, requirement: '', stage: 'new', notes: '' };

export default function Leads() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [agents, setAgents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [units, setUnits] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [delTarget, setDelTarget] = useState(null);
  const [phoneCheck, setPhoneCheck] = useState(null);
  const [force, setForce] = useState(false);
  const [unassigned, setUnassigned] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignAgentId, setAssignAgentId] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function checkPhone() {
    setPhoneCheck(null);
    const phone = (form.phone || '').replace(/\D/g, '');
    if (phone.length < 10) return;
    try {
      const params = { phone };
      if (edit) params.exceptId = edit.id;
      const { data } = await api.get('/admin/leads/check', { params });
      setPhoneCheck(data.data);
    } catch { /* */ }
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, pageSize: 20 };
      if (search) params.search = search;
      if (stage) params.stage = stage;
      if (unassigned) params.unassigned = true;
      else if (agentFilter) params.agentId = agentFilter;
      const { data: res } = await api.get('/admin/leads', { params });
      setData(res.data);
    } catch (e) { toast.error(apiError(e, 'Could not load leads')); } finally { setLoading(false); }
  }, [page, search, stage, agentFilter, unassigned, toast]);

  const loadStats = useCallback(async () => {
    try { const { data } = await api.get('/admin/leads/stats'); setStats(data.data); } catch { /* */ }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { setPage(1); }, [search, stage, agentFilter, unassigned]);
  useEffect(() => {
    api.get('/admin/agents', { params: { pageSize: 100 } }).then(r => setAgents(r.data.data.rows)).catch(() => {});
    api.get('/admin/inventory').then(r => setProjects(r.data.data)).catch(() => {});
  }, []);
  useEffect(() => {
    if (!form.projectId) { setUnits([]); return; }
    api.get(`/admin/inventory/${form.projectId}/units`).then(r => setUnits(r.data.data)).catch(() => setUnits([]));
  }, [form.projectId]);

  function openCreate() { setEdit(null); setForm(empty); setPhoneCheck(null); setForce(false); setFormOpen(true); }
  function openEdit(r) { setEdit(r); setForm({ ...empty, ...r, agentId: r.agentId || '', projectId: r.projectId || '', unitId: r.unitId || '' }); setPhoneCheck(null); setForce(false); setFormOpen(true); }

  async function submit() {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setBusy(true);
    try {
      const payload = {
        agentId: form.agentId ? Number(form.agentId) : null,
        name: form.name, phone: form.phone || null, email: form.email || null, source: form.source,
        projectId: form.projectId ? Number(form.projectId) : null,
        unitId: form.unitId ? Number(form.unitId) : null,
        budget: Number(form.budget) || 0, requirement: form.requirement || null,
        stage: form.stage, notes: form.notes || null, force,
      };
      if (edit) await api.put(`/admin/leads/${edit.id}`, payload);
      else await api.post('/admin/leads', payload);
      toast.success(edit ? 'Lead updated' : 'Lead created');
      setFormOpen(false); load(); loadStats();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function changeStage(r, newStage) {
    try { await api.post(`/admin/leads/${r.id}/stage`, { stage: newStage }); toast.success('Stage updated'); load(); loadStats(); }
    catch (e) { toast.error(apiError(e)); }
  }

  // ---- tasks ----
  const [tasksLead, setTasksLead] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const loadTasks = useCallback(async (leadId) => {
    setTasksLoading(true);
    try { const { data } = await api.get(`/admin/leads/${leadId}/tasks`); setTasks(data.data); }
    catch (e) { toast.error(apiError(e)); } finally { setTasksLoading(false); }
  }, [toast]);
  function openTasks(r) { setTasksLead(r); loadTasks(r.id); }
  async function createTask(payload) {
    try { await api.post(`/admin/leads/${tasksLead.id}/tasks`, payload); loadTasks(tasksLead.id); }
    catch (e) { toast.error(apiError(e)); }
  }
  async function toggleTask(t) {
    try { await api.post(`/admin/leads/tasks/${t.id}/done`, { done: !t.isDone }); loadTasks(tasksLead.id); }
    catch (e) { toast.error(apiError(e)); }
  }
  async function deleteTask(t) {
    try { await api.delete(`/admin/leads/tasks/${t.id}`); loadTasks(tasksLead.id); }
    catch (e) { toast.error(apiError(e)); }
  }

  // ---- notes & documents (2.8) ----
  const [actLead, setActLead] = useState(null);
  const [notes, setNotes] = useState([]);
  const [docs, setDocs] = useState([]);
  const [actLoading, setActLoading] = useState(false);
  const loadActivity = useCallback(async (leadId) => {
    setActLoading(true);
    try {
      const [n, d] = await Promise.all([
        api.get(`/admin/leads/${leadId}/notes`),
        api.get(`/admin/leads/${leadId}/documents`),
      ]);
      setNotes(n.data.data); setDocs(d.data.data);
    } catch (e) { toast.error(apiError(e)); } finally { setActLoading(false); }
  }, [toast]);
  function openActivity(r) { setActLead(r); loadActivity(r.id); }
  async function addNote(body) { try { await api.post(`/admin/leads/${actLead.id}/notes`, { body }); loadActivity(actLead.id); } catch (e) { toast.error(apiError(e)); } }
  async function delNote(n) { try { await api.delete(`/admin/leads/notes/${n.id}`); loadActivity(actLead.id); } catch (e) { toast.error(apiError(e)); } }
  async function addDoc(payload) { try { await api.post(`/admin/leads/${actLead.id}/documents`, payload); loadActivity(actLead.id); } catch (e) { toast.error(apiError(e)); } }
  async function delDoc(d) { try { await api.delete(`/admin/leads/documents/${d.id}`); loadActivity(actLead.id); } catch (e) { toast.error(apiError(e)); } }

  async function exportCsv() {
    try {
      const params = {};
      if (search) params.search = search;
      if (stage) params.stage = stage;
      if (unassigned) params.unassigned = true;
      else if (agentFilter) params.agentId = agentFilter;
      const res = await api.get('/admin/leads/export.csv', { params, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a'); a.href = url; a.download = 'leads.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error(apiError(e, 'Export failed')); }
  }

  function openAssign(r) { setAssignTarget(r); setAssignAgentId(r.agentId || ''); }
  async function submitAssign() {
    setBusy(true);
    try {
      await api.post(`/admin/leads/${assignTarget.id}/assign`, { agentId: assignAgentId ? Number(assignAgentId) : null });
      toast.success('Lead assigned');
      setAssignTarget(null);
      load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function confirmDelete() {
    setBusy(true);
    try { await api.delete(`/admin/leads/${delTarget.id}`); toast.success('Lead deleted'); setDelTarget(null); load(); loadStats(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const columns = [
    { key: 'name', header: 'Lead', render: r => (<div><div className="font-medium text-slate-800">{r.name}</div><div className="text-xs text-slate-400">{r.phone || r.email || ''}</div></div>) },
    { key: 'agentName', header: 'Agent', render: r => r.agentName || '—' },
    { key: 'projectName', header: 'Project', render: r => r.projectName || '—' },
    { key: 'budget', header: 'Budget', render: r => r.budget ? fmtMoney(r.budget) : '—' },
    {
      key: 'stage', header: 'Stage',
      render: r => (
        <select value={r.stage} onChange={e => changeStage(r, e.target.value)} className="text-xs border border-slate-300 rounded px-1.5 py-1">
          {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      ),
    },
    { key: 'createdAt', header: 'Added', render: r => fmtDate(r.createdAt) },
  ];

  return (
    <div>
      <PageHeader title="Leads / CRM" subtitle={`${data.total} lead${data.total === 1 ? '' : 's'}`}>
        <button onClick={exportCsv} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50">Export CSV</button>
        <button onClick={openCreate} className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90">+ Add lead</button>
      </PageHeader>

      {stats && (
        <div className="grid grid-cols-3 lg:grid-cols-7 gap-3 mb-5">
          <StatCard label="Total" value={stats.total} icon="📇" />
          <StatCard label="New" value={stats.new} icon="🆕" />
          <StatCard label="Contacted" value={stats.contacted} icon="📞" />
          <StatCard label="Site Visit" value={stats.siteVisit} icon="📅" />
          <StatCard label="Negotiation" value={stats.negotiation} icon="🤝" />
          <StatCard label="Booked" value={stats.booked} icon="✅" />
          <StatCard label="Lost" value={stats.lost} icon="❌" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search name, phone, email…" />
        <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)} disabled={unassigned} className={`${inputClass} w-auto`}>
          <option value="">All agents</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <button onClick={() => setUnassigned(v => !v)} className={`px-3 py-1.5 rounded-lg text-sm border transition ${unassigned ? 'bg-brand-primary text-white border-brand-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>Unassigned</button>
        <div className="flex flex-wrap gap-1">
          {STAGE_FILTERS.map(f => (
            <button key={f.value} onClick={() => setStage(f.value)} className={`px-3 py-1.5 rounded-lg text-sm border transition ${stage === f.value ? 'bg-brand-primary text-white border-brand-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>{f.label}</button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={data.rows}
        loading={loading}
        empty="No leads yet."
        actions={r => (
          <div className="flex items-center gap-3">
            <button onClick={() => openAssign(r)} className="text-brand-primary font-semibold hover:underline">{r.agentName ? 'Reassign' : 'Assign'}</button>
            <button onClick={() => openTasks(r)} className="text-slate-600 font-semibold hover:underline">Tasks</button>
            <button onClick={() => openActivity(r)} className="text-slate-600 font-semibold hover:underline">Notes</button>
            <button onClick={() => openEdit(r)} className="text-slate-600 font-semibold hover:underline">Edit</button>
            <button onClick={() => setDelTarget(r)} className="text-rose-600 font-semibold hover:underline">Delete</button>
          </div>
        )}
      />
      <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />

      <FormModal open={formOpen} title={edit ? 'Edit lead' : 'Add lead'} onClose={() => setFormOpen(false)} onSubmit={submit} submitting={busy} submitLabel={edit ? 'Save' : 'Create'} wide>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Agent"><select className={inputClass} value={form.agentId} onChange={e => set('agentId', e.target.value)}><option value="">— Unassigned —</option>{agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
          <Field label="Name" required><input className={inputClass} value={form.name} onChange={e => set('name', e.target.value)} /></Field>
          <Field label="Phone"><input className={inputClass} value={form.phone || ''} onChange={e => set('phone', e.target.value)} onBlur={checkPhone} /></Field>
          <Field label="Email"><input className={inputClass} value={form.email || ''} onChange={e => set('email', e.target.value)} /></Field>
          <Field label="Source"><select className={inputClass} value={form.source} onChange={e => set('source', e.target.value)}>{SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></Field>
          <Field label="Project"><select className={inputClass} value={form.projectId} onChange={e => { set('projectId', e.target.value); set('unitId', ''); }}><option value="">— None —</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="Unit (optional)"><select className={inputClass} value={form.unitId} onChange={e => set('unitId', e.target.value)} disabled={!form.projectId}><option value="">— None —</option>{units.map(u => <option key={u.id} value={u.id}>{u.unitNo} ({u.status})</option>)}</select></Field>
          <Field label="Budget (₹)"><input type="number" className={inputClass} value={form.budget} onChange={e => set('budget', e.target.value)} /></Field>
          <Field label="Stage"><select className={inputClass} value={form.stage} onChange={e => set('stage', e.target.value)}>{STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></Field>
        </div>
        <Field label="Requirement"><input className={inputClass} value={form.requirement || ''} onChange={e => set('requirement', e.target.value)} /></Field>
        <Field label="Notes"><textarea className={inputClass} rows={2} value={form.notes || ''} onChange={e => set('notes', e.target.value)} /></Field>
        {phoneCheck && !phoneCheck.available && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">
            <p className="text-amber-800 font-semibold">⚠ Duplicate buyer</p>
            <p className="text-amber-700">Already registered by <b>{phoneCheck.agentName || 'another partner'}</b> (lead #{phoneCheck.leadId}) under the 90-day ownership lock.</p>
            <label className="flex items-center gap-2 mt-2 text-amber-800"><input type="checkbox" checked={force} onChange={e => setForce(e.target.checked)} /> Override and save anyway</label>
          </div>
        )}
      </FormModal>

      <FormModal open={!!assignTarget} title={`Assign — ${assignTarget?.name || ''}`} onClose={() => setAssignTarget(null)} onSubmit={submitAssign} submitting={busy} submitLabel="Assign">
        <Field label="Agent" hint="Choose the owning agent, or unassign">
          <select className={inputClass} value={assignAgentId} onChange={e => setAssignAgentId(e.target.value)}>
            <option value="">— Unassign —</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
      </FormModal>

      <LeadTasksModal
        open={!!tasksLead}
        title={tasksLead ? `Follow-ups — ${tasksLead.name}` : 'Follow-ups'}
        tasks={tasks}
        loading={tasksLoading}
        onClose={() => setTasksLead(null)}
        onCreate={createTask}
        onToggle={toggleTask}
        onDelete={deleteTask}
      />

      <LeadActivityModal
        open={!!actLead}
        title={actLead ? `Notes & files — ${actLead.name}` : 'Notes & files'}
        notes={notes}
        docs={docs}
        loading={actLoading}
        onClose={() => setActLead(null)}
        onAddNote={addNote}
        onDeleteNote={delNote}
        onAddDoc={addDoc}
        onDeleteDoc={delDoc}
      />

      <ConfirmDialog open={!!delTarget} title="Delete lead?" message={`Remove "${delTarget?.name}"? This cannot be undone.`} confirmLabel="Delete" danger busy={busy} onCancel={() => setDelTarget(null)} onConfirm={confirmDelete} />
    </div>
  );
}
