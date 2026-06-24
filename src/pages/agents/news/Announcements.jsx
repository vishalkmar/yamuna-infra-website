import React, { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../../../lib/api';
import { useToast } from '../../../components/Toast';
import PageHeader from '../../../components/PageHeader';
import DataTable from '../../../components/DataTable';
import StatusBadge from '../../../components/StatusBadge';
import ConfirmDialog from '../../../components/ConfirmDialog';
import FormModal, { Field, inputClass } from '../../../components/FormModal';
import ImageUploader from '../../../components/ImageUploader';
import { fmtDate } from '../../../lib/format';

const empty = { title: '', body: '', imageUrl: '', isPinned: false, isActive: true };

export default function Announcements() {
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
    try { const { data } = await api.get('/admin/agent-announcements'); setRows(data.data); }
    catch (e) { toast.error(apiError(e, 'Could not load')); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setEdit(null); setForm(empty); setFormOpen(true); }
  function openEdit(r) { setEdit(r); setForm({ ...empty, ...r }); setFormOpen(true); }

  async function submit() {
    if (!form.title.trim()) { toast.error('Title required'); return; }
    setBusy(true);
    try {
      const payload = { title: form.title, body: form.body || null, imageUrl: form.imageUrl || null, isPinned: !!form.isPinned, isActive: !!form.isActive };
      if (edit) await api.put(`/admin/agent-announcements/${edit.id}`, payload);
      else await api.post('/admin/agent-announcements', payload);
      toast.success(edit ? 'Updated' : 'Posted'); setFormOpen(false); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function confirmDelete() {
    setBusy(true);
    try { await api.delete(`/admin/agent-announcements/${delTarget.id}`); toast.success('Deleted'); setDelTarget(null); load(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const columns = [
    { key: 'title', header: 'Announcement', render: r => <div className="flex items-center gap-2">{r.isPinned && <span title="Pinned">📌</span>}<div><div className="font-medium text-slate-800">{r.title}</div><div className="text-xs text-slate-400 line-clamp-1">{r.body}</div></div></div> },
    { key: 'isActive', header: 'Active', render: r => <StatusBadge status={r.isActive ? 'active' : 'inactive'}>{r.isActive ? 'Yes' : 'No'}</StatusBadge> },
    { key: 'createdAt', header: 'Posted', render: r => fmtDate(r.createdAt) },
  ];

  return (
    <div>
      <PageHeader title="Agent News" subtitle="Company announcements for the partner network">
        <button onClick={openCreate} className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90">+ New post</button>
      </PageHeader>

      <DataTable columns={columns} rows={rows} loading={loading} empty="No announcements yet."
        actions={r => (
          <div className="flex items-center gap-3">
            <button onClick={() => openEdit(r)} className="text-slate-600 font-semibold hover:underline">Edit</button>
            <button onClick={() => setDelTarget(r)} className="text-rose-600 font-semibold hover:underline">Delete</button>
          </div>
        )}
      />

      <FormModal open={formOpen} title={edit ? 'Edit post' : 'New post'} onClose={() => setFormOpen(false)} onSubmit={submit} submitting={busy} submitLabel={edit ? 'Save' : 'Post'} wide>
        <Field label="Title" required><input className={inputClass} value={form.title} onChange={e => set('title', e.target.value)} /></Field>
        <Field label="Body"><textarea className={inputClass} rows={4} value={form.body || ''} onChange={e => set('body', e.target.value)} /></Field>
        <Field label="Image"><ImageUploader value={form.imageUrl} onChange={url => set('imageUrl', url)} label="Announcement image" /></Field>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={!!form.isPinned} onChange={e => set('isPinned', e.target.checked)} /> Pin to top</label>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={!!form.isActive} onChange={e => set('isActive', e.target.checked)} /> Active</label>
        </div>
      </FormModal>

      <ConfirmDialog open={!!delTarget} title="Delete post?" message={`Remove "${delTarget?.title}"?`} confirmLabel="Delete" danger busy={busy} onCancel={() => setDelTarget(null)} onConfirm={confirmDelete} />
    </div>
  );
}
