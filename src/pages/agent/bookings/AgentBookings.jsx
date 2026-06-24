import React, { useEffect, useState, useCallback } from 'react';
import agentApi, { apiError } from '../../../lib/agentApi';
import { useToast } from '../../../components/Toast';
import DataTable from '../../../components/DataTable';
import StatusBadge from '../../../components/StatusBadge';
import FormModal, { Field, inputClass } from '../../../components/FormModal';
import BookingDocsModal from '../../../components/BookingDocsModal';
import { fmtMoney, fmtDate } from '../../../lib/format';

export default function AgentBookings() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [units, setUnits] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ leadId: '', unitId: '', dealValue: 0, bookingAmount: 0, notes: '' });
  const [selLead, setSelLead] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await agentApi.get('/agent/bookings'); setRows(data.data); }
    catch (e) { toast.error(apiError(e, 'Could not load bookings')); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { agentApi.get('/agent/leads').then(r => setLeads(r.data.data)).catch(() => {}); }, []);

  // when a lead is picked, load its project's bookable units
  useEffect(() => {
    const lead = leads.find(l => String(l.id) === String(form.leadId));
    setSelLead(lead || null);
    if (lead && lead.projectId) {
      agentApi.get(`/agent/projects/${lead.projectId}/units`).then(r => setUnits(r.data.data)).catch(() => setUnits([]));
    } else setUnits([]);
  }, [form.leadId, leads]);

  function openCreate() { setForm({ leadId: '', unitId: '', dealValue: 0, bookingAmount: 0, notes: '' }); setOpen(true); }

  async function submit() {
    if (!form.leadId) { toast.error('Pick a lead'); return; }
    if (!form.unitId) { toast.error('Pick a unit'); return; }
    setBusy(true);
    try {
      await agentApi.post('/agent/bookings', {
        leadId: Number(form.leadId), unitId: Number(form.unitId),
        dealValue: Number(form.dealValue) || 0, bookingAmount: Number(form.bookingAmount) || 0,
        notes: form.notes || null,
      });
      toast.success('Booking created — pending approval');
      setOpen(false); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  async function submitCancel() {
    try { await agentApi.post(`/agent/bookings/${cancelTarget.id}/cancel`, { reason: cancelReason }); toast.success('Cancelled'); setCancelTarget(null); setCancelReason(''); load(); }
    catch (e) { toast.error(apiError(e)); }
  }

  // ---- documents ----
  const [docsBooking, setDocsBooking] = useState(null);
  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  async function loadDocs(id) {
    setDocsLoading(true);
    try { const { data } = await agentApi.get(`/agent/bookings/${id}/documents`); setDocs(data.data); }
    catch (e) { toast.error(apiError(e)); } finally { setDocsLoading(false); }
  }
  function openDocs(r) { setDocsBooking(r); loadDocs(r.id); }
  async function addDoc(payload) { try { await agentApi.post(`/agent/bookings/${docsBooking.id}/documents`, payload); loadDocs(docsBooking.id); } catch (e) { toast.error(apiError(e)); } }
  async function delDoc(d) { try { await agentApi.delete(`/agent/bookings/documents/${d.id}`); loadDocs(docsBooking.id); } catch (e) { toast.error(apiError(e)); } }

  const columns = [
    { key: 'buyerName', header: 'Buyer', render: r => (<div><div className="font-medium text-slate-800">{r.buyerName}</div><div className="text-xs text-slate-400">{r.buyerPhone || ''}</div></div>) },
    { key: 'projectName', header: 'Project', render: r => r.projectName ? `${r.projectName}${r.unitNo ? ' · ' + r.unitNo : ''}` : '—' },
    { key: 'dealValue', header: 'Deal', render: r => fmtMoney(r.dealValue) },
    { key: 'bookingAmount', header: 'Booking amt', render: r => fmtMoney(r.bookingAmount) },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status === 'approved' ? 'approved' : r.status === 'cancelled' ? 'cancelled' : 'pending'}>{r.status}</StatusBadge> },
    { key: 'createdAt', header: 'Created', render: r => fmtDate(r.createdAt) },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div><h2 className="text-lg font-bold text-slate-800">My Bookings</h2><p className="text-sm text-slate-500">{rows.length} booking{rows.length === 1 ? '' : 's'}</p></div>
        <button onClick={openCreate} className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90">+ New booking</button>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        empty="No bookings yet. Convert a lead to create one."
        actions={r => (
          <div className="flex items-center gap-3">
            <button onClick={() => openDocs(r)} className="text-slate-600 font-semibold hover:underline">Docs</button>
            {r.status === 'pending' && <button onClick={() => { setCancelTarget(r); setCancelReason(''); }} className="text-rose-600 font-semibold hover:underline">Cancel</button>}
          </div>
        )}
      />

      <FormModal open={open} title="New booking" onClose={() => setOpen(false)} onSubmit={submit} submitting={busy} submitLabel="Create booking">
        <Field label="Lead" required>
          <select className={inputClass} value={form.leadId} onChange={e => { set('leadId', e.target.value); set('unitId', ''); }}>
            <option value="">— Select lead —</option>
            {leads.map(l => <option key={l.id} value={l.id}>{l.name}{l.phone ? ` (${l.phone})` : ''}</option>)}
          </select>
        </Field>
        {selLead && !selLead.projectId && <p className="text-sm text-amber-600">This lead has no project set. Add a project to the lead first (in My Leads).</p>}
        <Field label="Unit" required>
          <select className={inputClass} value={form.unitId} onChange={e => set('unitId', e.target.value)} disabled={!form.leadId || !selLead?.projectId}>
            <option value="">— Select unit —</option>
            {units.map(u => <option key={u.id} value={u.id} disabled={u.status !== 'available' && u.status !== 'held'}>{u.unitNo} · {u.unitType || ''} · {fmtMoney(u.basePrice)} ({u.status})</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Deal value (₹)"><input type="number" className={inputClass} value={form.dealValue} onChange={e => set('dealValue', e.target.value)} /></Field>
          <Field label="Booking amount (₹)"><input type="number" className={inputClass} value={form.bookingAmount} onChange={e => set('bookingAmount', e.target.value)} /></Field>
        </div>
        <Field label="Notes"><textarea className={inputClass} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></Field>
      </FormModal>

      <FormModal open={!!cancelTarget} title="Cancel booking" onClose={() => setCancelTarget(null)} onSubmit={submitCancel} submitLabel="Cancel booking">
        <p className="text-sm text-slate-500">Only pending bookings can be cancelled by you. The unit is released.</p>
        <Field label="Reason"><textarea className={inputClass} rows={3} value={cancelReason} onChange={e => setCancelReason(e.target.value)} /></Field>
      </FormModal>

      <BookingDocsModal
        open={!!docsBooking}
        title={docsBooking ? `Documents — ${docsBooking.buyerName}` : 'Documents'}
        docs={docs}
        loading={docsLoading}
        onClose={() => setDocsBooking(null)}
        onAdd={addDoc}
        onDelete={delDoc}
      />
    </div>
  );
}
