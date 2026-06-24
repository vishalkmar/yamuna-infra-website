import React, { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../../../lib/api';
import { useToast } from '../../../components/Toast';
import PageHeader from '../../../components/PageHeader';
import DataTable from '../../../components/DataTable';
import StatusBadge from '../../../components/StatusBadge';
import ConfirmDialog from '../../../components/ConfirmDialog';
import FormModal, { Field, inputClass } from '../../../components/FormModal';

const CHANNELS = ['whatsapp', 'sms', 'email'];
const empty = { channel: 'whatsapp', title: '', subject: '', body: '', isActive: true, sortOrder: 0 };

export default function Templates() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [delTarget, setDelTarget] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/admin/lead-templates'); setRows(data.data); }
    catch (e) { toast.error(apiError(e, 'Could not load')); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setEdit(null); setForm(empty); setFormOpen(true); }
  function openEdit(r) { setEdit(r); setForm({ ...empty, ...r }); setFormOpen(true); }

  async function submit() {
    if (!form.title.trim() || !form.body.trim()) { toast.error('Title and body required'); return; }
    setBusy(true);
    try {
      const payload = { channel: form.channel, title: form.title, subject: form.subject || null, body: form.body, isActive: !!form.isActive, sortOrder: Number(form.sortOrder) || 0 };
      if (edit) await api.put(`/admin/lead-templates/${edit.id}`, payload);
      else await api.post('/admin/lead-templates', payload);
      toast.success(edit ? 'Updated' : 'Added'); setFormOpen(false); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function confirmDelete() {
    setBusy(true);
    try { await api.delete(`/admin/lead-templates/${delTarget.id}`); toast.success('Deleted'); setDelTarget(null); load(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const columns = [
    { key: 'channel', header: 'Channel', render: r => <span className="capitalize">{r.channel}</span> },
    { key: 'title', header: 'Title', render: r => <div><div className="font-medium text-slate-800">{r.title}</div><div className="text-xs text-slate-400 line-clamp-1">{r.body}</div></div> },
    { key: 'isActive', header: 'Active', render: r => <StatusBadge status={r.isActive ? 'active' : 'inactive'}>{r.isActive ? 'Yes' : 'No'}</StatusBadge> },
  ];

  return (
    <div>
      <PageHeader title="Message Templates" subtitle="Quick WhatsApp / SMS / Email messages for agents. Use {{name}} and {{project}}.">
        <button onClick={openCreate} className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90">+ Add template</button>
      </PageHeader>

      <DataTable columns={columns} rows={rows} loading={loading} empty="No templates yet."
        actions={r => (
          <div className="flex items-center gap-3">
            <button onClick={() => openEdit(r)} className="text-slate-600 font-semibold hover:underline">Edit</button>
            <button onClick={() => setDelTarget(r)} className="text-rose-600 font-semibold hover:underline">Delete</button>
          </div>
        )}
      />

      <FormModal open={formOpen} title={edit ? 'Edit template' : 'Add template'} onClose={() => setFormOpen(false)} onSubmit={submit} submitting={busy} submitLabel={edit ? 'Save' : 'Add'}>
        <Field label="Channel"><select className={inputClass} value={form.channel} onChange={e => set('channel', e.target.value)}>{CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}</select></Field>
        <Field label="Title" required><input className={inputClass} value={form.title} onChange={e => set('title', e.target.value)} /></Field>
        {form.channel === 'email' && <Field label="Subject"><input className={inputClass} value={form.subject || ''} onChange={e => set('subject', e.target.value)} /></Field>}
        <Field label="Body" hint="Placeholders: {{name}}, {{project}}" required><textarea className={inputClass} rows={5} value={form.body} onChange={e => set('body', e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={!!form.isActive} onChange={e => set('isActive', e.target.checked)} /> Active</label>
      </FormModal>

      <ConfirmDialog open={!!delTarget} title="Delete template?" message={`Remove "${delTarget?.title}"?`} confirmLabel="Delete" danger busy={busy} onCancel={() => setDelTarget(null)} onConfirm={confirmDelete} />
    </div>
  );
}
