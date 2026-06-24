import React, { useEffect, useState, useCallback } from 'react';
import agentApi, { apiError } from '../../../lib/agentApi';
import { useToast } from '../../../components/Toast';
import DataTable from '../../../components/DataTable';
import StatusBadge from '../../../components/StatusBadge';
import FormModal, { Field, inputClass } from '../../../components/FormModal';
import VisitOutcomeModal from '../../../components/VisitOutcomeModal';
import { fmtDateTime } from '../../../lib/format';
import { VISIT_SLOTS } from '../../../lib/visitSlots';

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'requested', label: 'Requested' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function AgentVisits() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [leads, setLeads] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ leadId: '', scheduledAt: '', slot: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await agentApi.get('/agent/visits', { params: status ? { status } : {} });
      setRows(data.data);
    } catch (e) { toast.error(apiError(e, 'Could not load visits')); } finally { setLoading(false); }
  }, [status, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { agentApi.get('/agent/leads').then(r => setLeads(r.data.data)).catch(() => {}); }, []);

  async function submit() {
    if (!form.leadId) { toast.error('Pick a lead'); return; }
    if (!form.scheduledAt) { toast.error('Pick date & time'); return; }
    setBusy(true);
    try {
      await agentApi.post('/agent/visits', {
        leadId: Number(form.leadId),
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        slot: form.slot || null,
        notes: form.notes || null,
      });
      toast.success('Visit scheduled');
      setOpen(false); setForm({ leadId: '', scheduledAt: '', slot: '', notes: '' });
      load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function cancel(r) {
    try { await agentApi.post(`/agent/visits/${r.id}/cancel`); toast.success('Cancelled'); load(); }
    catch (e) { toast.error(apiError(e)); }
  }
  async function checkIn(r) {
    try { await agentApi.post(`/agent/visits/${r.id}/checkin`); toast.success('Checked in'); load(); }
    catch (e) { toast.error(apiError(e)); }
  }
  const [outcomeVisit, setOutcomeVisit] = useState(null);
  const [outcomeBusy, setOutcomeBusy] = useState(false);
  async function submitOutcome(payload) {
    setOutcomeBusy(true);
    try { await agentApi.post(`/agent/visits/${outcomeVisit.id}/outcome`, payload); toast.success('Outcome recorded'); setOutcomeVisit(null); load(); }
    catch (e) { toast.error(apiError(e)); } finally { setOutcomeBusy(false); }
  }

  const columns = [
    { key: 'leadName', header: 'Lead', render: r => (<div><div className="font-medium text-slate-800">{r.leadName}</div><div className="text-xs text-slate-400">{r.leadPhone || ''}</div></div>) },
    { key: 'projectName', header: 'Project', render: r => r.projectName || '—' },
    { key: 'unitNo', header: 'Unit', render: r => r.unitNo || '—' },
    { key: 'scheduledAt', header: 'When', render: r => fmtDateTime(r.scheduledAt) },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status}>{r.status}</StatusBadge> },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div><h2 className="text-lg font-bold text-slate-800">Site Visits</h2><p className="text-sm text-slate-500">{rows.length} visit{rows.length === 1 ? '' : 's'}</p></div>
        <button onClick={() => setOpen(true)} className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90">+ Schedule visit</button>
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setStatus(f.key)} className={`px-3 py-1.5 rounded-lg text-sm border transition ${status === f.key ? 'bg-brand-primary text-white border-brand-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>{f.label}</button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        empty="No visits scheduled yet."
        actions={r => (r.status === 'requested' || r.status === 'confirmed') ? (
          <div className="flex items-center gap-3">
            {!r.checkedInAt && <button onClick={() => checkIn(r)} className="text-sky-600 font-semibold hover:underline">Check-in</button>}
            <button onClick={() => setOutcomeVisit(r)} className="text-brand-primary font-semibold hover:underline">Outcome</button>
            <button onClick={() => cancel(r)} className="text-rose-600 font-semibold hover:underline">Cancel</button>
          </div>
        ) : <span className="text-slate-300">—</span>}
      />

      <FormModal open={open} title="Schedule site visit" onClose={() => setOpen(false)} onSubmit={submit} submitting={busy} submitLabel="Schedule">
        <Field label="Lead" required>
          <select className={inputClass} value={form.leadId} onChange={e => set('leadId', e.target.value)}>
            <option value="">— Select lead —</option>
            {leads.map(l => <option key={l.id} value={l.id}>{l.name}{l.phone ? ` (${l.phone})` : ''}</option>)}
          </select>
        </Field>
        <Field label="Date & time" required><input type="datetime-local" className={inputClass} value={form.scheduledAt} onChange={e => set('scheduledAt', e.target.value)} /></Field>
        <Field label="Slot (optional)"><select className={inputClass} value={form.slot} onChange={e => set('slot', e.target.value)}><option value="">— Any —</option>{VISIT_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}</select></Field>
        <Field label="Notes"><textarea className={inputClass} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></Field>
      </FormModal>

      <VisitOutcomeModal open={!!outcomeVisit} busy={outcomeBusy} onClose={() => setOutcomeVisit(null)} onSubmit={submitOutcome} />
    </div>
  );
}
