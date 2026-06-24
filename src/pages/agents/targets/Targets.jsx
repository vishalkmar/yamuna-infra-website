import React, { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../../../lib/api';
import { useToast } from '../../../components/Toast';
import PageHeader from '../../../components/PageHeader';
import DataTable from '../../../components/DataTable';
import StatusBadge from '../../../components/StatusBadge';
import ConfirmDialog from '../../../components/ConfirmDialog';
import FormModal, { Field, inputClass } from '../../../components/FormModal';
import { fmtMoney, fmtDate } from '../../../lib/format';

const empty = { agentId: '', title: '', metric: 'deal_value', targetValue: 0, periodStart: '', periodEnd: '', incentiveAmount: 0, notes: '' };

function pct(achieved, target) {
  const t = Number(target) || 0;
  if (t <= 0) return 0;
  return Math.min(100, Math.round((Number(achieved) || 0) / t * 100));
}
const fmtMetric = (v, metric) => metric === 'bookings' ? `${Number(v) || 0}` : fmtMoney(v);

export default function Targets() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState([]);
  const [agentFilter, setAgentFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [delTarget, setDelTarget] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/admin/targets', { params: agentFilter ? { agentId: agentFilter } : {} }); setRows(data.data); }
    catch (e) { toast.error(apiError(e, 'Could not load targets')); } finally { setLoading(false); }
  }, [agentFilter, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get('/admin/agents', { params: { pageSize: 100 } }).then(r => setAgents(r.data.data.rows)).catch(() => {}); }, []);

  function openCreate() { setEdit(null); setForm(empty); setFormOpen(true); }
  function openEdit(r) {
    setEdit(r);
    setForm({ ...empty, ...r, agentId: r.agentId || '', periodStart: String(r.periodStart).slice(0, 10), periodEnd: String(r.periodEnd).slice(0, 10) });
    setFormOpen(true);
  }

  async function submit() {
    if (!form.agentId) { toast.error('Pick an agent'); return; }
    if (!form.title.trim()) { toast.error('Title required'); return; }
    if (!form.periodStart || !form.periodEnd) { toast.error('Period required'); return; }
    setBusy(true);
    try {
      const payload = {
        agentId: Number(form.agentId), title: form.title, metric: form.metric,
        targetValue: Number(form.targetValue) || 0, periodStart: form.periodStart, periodEnd: form.periodEnd,
        incentiveAmount: Number(form.incentiveAmount) || 0, notes: form.notes || null,
      };
      if (edit) await api.put(`/admin/targets/${edit.id}`, payload);
      else await api.post('/admin/targets', payload);
      toast.success(edit ? 'Target updated' : 'Target created');
      setFormOpen(false); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function award(r) {
    try { const { data } = await api.post(`/admin/targets/${r.id}/award`); toast.success(`Awarded ${fmtMoney(data.data.amount)}`); load(); }
    catch (e) { toast.error(apiError(e)); }
  }

  async function confirmDelete() {
    setBusy(true);
    try { await api.delete(`/admin/targets/${delTarget.id}`); toast.success('Deleted'); setDelTarget(null); load(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const columns = [
    { key: 'agentName', header: 'Agent', render: r => r.agentName || '—' },
    { key: 'title', header: 'Target', render: r => <div><div className="font-medium text-slate-800">{r.title}</div><div className="text-xs text-slate-400">{fmtDate(r.periodStart)} – {fmtDate(r.periodEnd)}</div></div> },
    {
      key: 'progress', header: 'Progress',
      render: r => {
        const p = pct(r.achieved, r.targetValue);
        return (
          <div className="w-40">
            <div className="flex justify-between text-xs text-slate-500 mb-0.5"><span>{fmtMetric(r.achieved, r.metric)} / {fmtMetric(r.targetValue, r.metric)}</span><span>{p}%</span></div>
            <div className="h-2 rounded bg-slate-100 overflow-hidden"><div className={`h-full ${p >= 100 ? 'bg-emerald-500' : 'bg-brand-primary'}`} style={{ width: `${p}%` }} /></div>
          </div>
        );
      },
    },
    { key: 'incentiveAmount', header: 'Incentive', render: r => r.incentiveAmount ? fmtMoney(r.incentiveAmount) : '—' },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status === 'awarded' ? 'approved' : 'pending'}>{r.status}</StatusBadge> },
  ];

  return (
    <div>
      <PageHeader title="Targets & Incentives" subtitle={`${rows.length} target${rows.length === 1 ? '' : 's'}`}>
        <button onClick={openCreate} className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90">+ Add target</button>
      </PageHeader>

      <div className="mb-4">
        <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)} className={`${inputClass} w-auto`}>
          <option value="">All agents</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        empty="No targets yet."
        actions={r => (
          <div className="flex items-center gap-3">
            {r.status !== 'awarded' && pct(r.achieved, r.targetValue) >= 100 && r.incentiveAmount > 0 && <button onClick={() => award(r)} className="text-emerald-600 font-semibold hover:underline">Award</button>}
            <button onClick={() => openEdit(r)} className="text-slate-600 font-semibold hover:underline">Edit</button>
            <button onClick={() => setDelTarget(r)} className="text-rose-600 font-semibold hover:underline">Delete</button>
          </div>
        )}
      />

      <FormModal open={formOpen} title={edit ? 'Edit target' : 'Add target'} onClose={() => setFormOpen(false)} onSubmit={submit} submitting={busy} submitLabel={edit ? 'Save' : 'Create'} wide>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Agent" required><select className={inputClass} value={form.agentId} onChange={e => set('agentId', e.target.value)}><option value="">— Select —</option>{agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
          <Field label="Title" required><input className={inputClass} value={form.title} onChange={e => set('title', e.target.value)} /></Field>
          <Field label="Metric"><select className={inputClass} value={form.metric} onChange={e => set('metric', e.target.value)}><option value="deal_value">Deal value (₹)</option><option value="bookings">Bookings (count)</option></select></Field>
          <Field label="Target value"><input type="number" className={inputClass} value={form.targetValue} onChange={e => set('targetValue', e.target.value)} /></Field>
          <Field label="Period start"><input type="date" className={inputClass} value={form.periodStart} onChange={e => set('periodStart', e.target.value)} /></Field>
          <Field label="Period end"><input type="date" className={inputClass} value={form.periodEnd} onChange={e => set('periodEnd', e.target.value)} /></Field>
          <Field label="Incentive (₹)" hint="Bonus on achieving"><input type="number" className={inputClass} value={form.incentiveAmount} onChange={e => set('incentiveAmount', e.target.value)} /></Field>
        </div>
        <Field label="Notes"><input className={inputClass} value={form.notes} onChange={e => set('notes', e.target.value)} /></Field>
      </FormModal>

      <ConfirmDialog open={!!delTarget} title="Delete target?" message={`Remove "${delTarget?.title}"?`} confirmLabel="Delete" danger busy={busy} onCancel={() => setDelTarget(null)} onConfirm={confirmDelete} />
    </div>
  );
}
