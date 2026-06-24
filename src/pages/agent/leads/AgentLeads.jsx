import React, { useEffect, useState, useCallback } from 'react';
import agentApi, { apiError } from '../../../lib/agentApi';
import { useToast } from '../../../components/Toast';
import SearchBar from '../../../components/SearchBar';
import DataTable from '../../../components/DataTable';
import FormModal, { Field, inputClass } from '../../../components/FormModal';
import LeadTasksModal from '../../../components/LeadTasksModal';
import LeadActivityModal from '../../../components/LeadActivityModal';
import LeadReachOutModal from './LeadReachOutModal';
import { fmtMoney, fmtDate } from '../../../lib/format';

export const STAGES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'site_visit', label: 'Site Visit' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'booked', label: 'Booked' },
  { value: 'lost', label: 'Lost' },
];
const SOURCES = [
  { value: 'walk_in', label: 'Walk-in' }, { value: 'referral', label: 'Referral' },
  { value: 'online', label: 'Online' }, { value: 'call', label: 'Call' },
  { value: 'social', label: 'Social' }, { value: 'other', label: 'Other' },
];
const STAGE_FILTERS = [{ value: '', label: 'All' }, ...STAGES];
const empty = { name: '', phone: '', email: '', source: 'other', projectId: '', unitId: '', budget: 0, requirement: '', stage: 'new', notes: '' };

export default function AgentLeads() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [projects, setProjects] = useState([]);
  const [units, setUnits] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [phoneCheck, setPhoneCheck] = useState(null); // { available, ownedByYou, lockedUntil }
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function checkPhone() {
    setPhoneCheck(null);
    const phone = (form.phone || '').replace(/\D/g, '');
    if (phone.length < 10) return;
    try {
      const params = { phone };
      if (edit) params.exceptId = edit.id;
      const { data } = await agentApi.get('/agent/leads/check', { params });
      setPhoneCheck(data.data);
    } catch { /* non-blocking */ }
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (stage) params.stage = stage;
      const { data } = await agentApi.get('/agent/leads', { params });
      setRows(data.data);
    } catch (e) { toast.error(apiError(e, 'Could not load leads')); } finally { setLoading(false); }
  }, [search, stage, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { agentApi.get('/agent/projects').then(r => setProjects(r.data.data)).catch(() => {}); }, []);

  // load units when a project is chosen in the form
  useEffect(() => {
    if (!form.projectId) { setUnits([]); return; }
    agentApi.get(`/agent/projects/${form.projectId}/units`).then(r => setUnits(r.data.data)).catch(() => setUnits([]));
  }, [form.projectId]);

  function openCreate() { setEdit(null); setForm(empty); setPhoneCheck(null); setFormOpen(true); }
  function openEdit(r) { setEdit(r); setForm({ ...empty, ...r, projectId: r.projectId || '', unitId: r.unitId || '' }); setPhoneCheck(null); setFormOpen(true); }

  async function submit() {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setBusy(true);
    try {
      const payload = {
        name: form.name, phone: form.phone || null, email: form.email || null, source: form.source,
        projectId: form.projectId ? Number(form.projectId) : null,
        unitId: form.unitId ? Number(form.unitId) : null,
        budget: Number(form.budget) || 0, requirement: form.requirement || null,
        stage: form.stage, notes: form.notes || null,
      };
      if (edit) await agentApi.put(`/agent/leads/${edit.id}`, payload);
      else await agentApi.post('/agent/leads', payload);
      toast.success(edit ? 'Lead updated' : 'Lead created');
      setFormOpen(false); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function changeStage(r, newStage) {
    try { await agentApi.post(`/agent/leads/${r.id}/stage`, { stage: newStage }); toast.success('Stage updated'); load(); }
    catch (e) { toast.error(apiError(e)); }
  }

  // ---- tasks ----
  const [tasksLead, setTasksLead] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  async function loadTasks(leadId) {
    setTasksLoading(true);
    try { const { data } = await agentApi.get(`/agent/leads/${leadId}/tasks`); setTasks(data.data); }
    catch (e) { toast.error(apiError(e)); } finally { setTasksLoading(false); }
  }
  function openTasks(r) { setTasksLead(r); loadTasks(r.id); }
  async function createTask(payload) {
    try { await agentApi.post(`/agent/leads/${tasksLead.id}/tasks`, payload); loadTasks(tasksLead.id); }
    catch (e) { toast.error(apiError(e)); }
  }
  async function toggleTask(t) {
    try { await agentApi.post(`/agent/tasks/${t.id}/done`, { done: !t.isDone }); loadTasks(tasksLead.id); }
    catch (e) { toast.error(apiError(e)); }
  }
  async function deleteTask(t) {
    try { await agentApi.delete(`/agent/tasks/${t.id}`); loadTasks(tasksLead.id); }
    catch (e) { toast.error(apiError(e)); }
  }

  const [reachLead, setReachLead] = useState(null);

  // ---- notes & documents (2.8) ----
  const [actLead, setActLead] = useState(null);
  const [notes, setNotes] = useState([]);
  const [docs, setDocs] = useState([]);
  const [actLoading, setActLoading] = useState(false);
  async function loadActivity(leadId) {
    setActLoading(true);
    try {
      const [n, d] = await Promise.all([
        agentApi.get(`/agent/leads/${leadId}/notes`),
        agentApi.get(`/agent/leads/${leadId}/documents`),
      ]);
      setNotes(n.data.data); setDocs(d.data.data);
    } catch (e) { toast.error(apiError(e)); } finally { setActLoading(false); }
  }
  function openActivity(r) { setActLead(r); loadActivity(r.id); }
  async function addNote(body) { try { await agentApi.post(`/agent/leads/${actLead.id}/notes`, { body }); loadActivity(actLead.id); } catch (e) { toast.error(apiError(e)); } }
  async function delNote(n) { try { await agentApi.delete(`/agent/leads/notes/${n.id}`); loadActivity(actLead.id); } catch (e) { toast.error(apiError(e)); } }
  async function addDoc(payload) { try { await agentApi.post(`/agent/leads/${actLead.id}/documents`, payload); loadActivity(actLead.id); } catch (e) { toast.error(apiError(e)); } }
  async function delDoc(d) { try { await agentApi.delete(`/agent/leads/documents/${d.id}`); loadActivity(actLead.id); } catch (e) { toast.error(apiError(e)); } }

  const columns = [
    { key: 'name', header: 'Lead', render: r => (<div><div className="font-medium text-slate-800">{r.name}</div><div className="text-xs text-slate-400">{r.phone || r.email || ''}</div></div>) },
    { key: 'projectName', header: 'Project', render: r => r.projectName || '—' },
    { key: 'unitNo', header: 'Unit', render: r => r.unitNo || '—' },
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
      <div className="flex items-center justify-between mb-4">
        <div><h2 className="text-lg font-bold text-slate-800">My Leads</h2><p className="text-sm text-slate-500">{rows.length} lead{rows.length === 1 ? '' : 's'}</p></div>
        <button onClick={openCreate} className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90">+ Add lead</button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search name, phone, email…" />
        <div className="flex flex-wrap gap-1">
          {STAGE_FILTERS.map(f => (
            <button key={f.value} onClick={() => setStage(f.value)} className={`px-3 py-1.5 rounded-lg text-sm border transition ${stage === f.value ? 'bg-brand-primary text-white border-brand-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>{f.label}</button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        empty="No leads yet. Add a buyer enquiry to start your pipeline."
        actions={r => (
          <div className="flex items-center gap-3">
            <button onClick={() => setReachLead(r)} className="text-emerald-600 font-semibold hover:underline">Reach</button>
            <button onClick={() => openTasks(r)} className="text-slate-600 font-semibold hover:underline">Tasks</button>
            <button onClick={() => openActivity(r)} className="text-slate-600 font-semibold hover:underline">Notes</button>
            <button onClick={() => openEdit(r)} className="text-brand-primary font-semibold hover:underline">Edit</button>
          </div>
        )}
      />

      <FormModal open={formOpen} title={edit ? 'Edit lead' : 'Add lead'} onClose={() => setFormOpen(false)} onSubmit={submit} submitting={busy} submitLabel={edit ? 'Save' : 'Create'} wide>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" required><input className={inputClass} value={form.name} onChange={e => set('name', e.target.value)} /></Field>
          <Field label="Phone" hint={phoneCheck && !phoneCheck.available ? (phoneCheck.ownedByYou ? '⚠ You already have a lead with this number.' : '⚠ Already registered by another partner.') : undefined}>
            <input className={inputClass} value={form.phone || ''} onChange={e => set('phone', e.target.value)} onBlur={checkPhone} />
          </Field>
          <Field label="Email"><input className={inputClass} value={form.email || ''} onChange={e => set('email', e.target.value)} /></Field>
          <Field label="Source"><select className={inputClass} value={form.source} onChange={e => set('source', e.target.value)}>{SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></Field>
          <Field label="Project"><select className={inputClass} value={form.projectId} onChange={e => { set('projectId', e.target.value); set('unitId', ''); }}><option value="">— None —</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="Unit (optional)"><select className={inputClass} value={form.unitId} onChange={e => set('unitId', e.target.value)} disabled={!form.projectId}><option value="">— None —</option>{units.map(u => <option key={u.id} value={u.id}>{u.unitNo} ({u.status})</option>)}</select></Field>
          <Field label="Budget (₹)"><input type="number" className={inputClass} value={form.budget} onChange={e => set('budget', e.target.value)} /></Field>
          <Field label="Stage"><select className={inputClass} value={form.stage} onChange={e => set('stage', e.target.value)}>{STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></Field>
        </div>
        <Field label="Requirement"><input className={inputClass} placeholder="2BHK, east facing, ready-to-move…" value={form.requirement || ''} onChange={e => set('requirement', e.target.value)} /></Field>
        <Field label="Notes"><textarea className={inputClass} rows={2} value={form.notes || ''} onChange={e => set('notes', e.target.value)} /></Field>
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

      <LeadReachOutModal open={!!reachLead} lead={reachLead} onClose={() => { setReachLead(null); load(); }} />

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
    </div>
  );
}
