import React, { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../lib/api';
import { useToast } from './Toast';
import PageHeader from './PageHeader';
import SearchBar from './SearchBar';
import DataTable from './DataTable';
import StatusBadge from './StatusBadge';
import ConfirmDialog from './ConfirmDialog';
import FormModal, { Field, inputClass } from './FormModal';
import ImageUploader from './ImageUploader';

const FILE_TYPES = ['pdf', 'image', 'video', 'doc', 'link'];
const empty = { category: '', title: '', description: '', url: '', fileType: 'pdf', thumbnailUrl: '', isActive: true, sortOrder: 0 };

// Admin manager for agent_resources of a given `kind` (collateral | training).
export default function ResourceManager({ kind, title, subtitle }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [delTarget, setDelTarget] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { kind };
      if (search) params.search = search;
      const { data } = await api.get('/admin/agent-resources', { params });
      setRows(data.data);
    } catch (e) { toast.error(apiError(e, 'Could not load')); } finally { setLoading(false); }
  }, [kind, search, toast]);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setEdit(null); setForm(empty); setFormOpen(true); }
  function openEdit(r) { setEdit(r); setForm({ ...empty, ...r }); setFormOpen(true); }

  async function submit() {
    if (!form.title.trim()) { toast.error('Title required'); return; }
    if (!form.url.trim()) { toast.error('File/link URL required'); return; }
    setBusy(true);
    try {
      const payload = {
        kind, category: form.category || null, title: form.title, description: form.description || null,
        url: form.url, fileType: form.fileType, thumbnailUrl: form.thumbnailUrl || null,
        isActive: !!form.isActive, sortOrder: Number(form.sortOrder) || 0,
      };
      if (edit) await api.put(`/admin/agent-resources/${edit.id}`, payload);
      else await api.post('/admin/agent-resources', payload);
      toast.success(edit ? 'Updated' : 'Added');
      setFormOpen(false); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function confirmDelete() {
    setBusy(true);
    try { await api.delete(`/admin/agent-resources/${delTarget.id}`); toast.success('Deleted'); setDelTarget(null); load(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const columns = [
    {
      key: 'title', header: 'Item',
      render: r => (
        <div className="flex items-center gap-2">
          {r.thumbnailUrl ? <img src={r.thumbnailUrl} alt="" className="w-9 h-9 rounded object-cover border border-slate-200" /> : <div className="w-9 h-9 rounded bg-slate-100 grid place-items-center">📄</div>}
          <div><div className="font-medium text-slate-800">{r.title}</div><div className="text-xs text-slate-400">{r.category || '—'}</div></div>
        </div>
      ),
    },
    { key: 'fileType', header: 'Type', render: r => r.fileType },
    { key: 'url', header: 'File', render: r => <a href={r.url} target="_blank" rel="noreferrer" className="text-brand-primary hover:underline text-sm">Open</a> },
    { key: 'isActive', header: 'Active', render: r => <StatusBadge status={r.isActive ? 'active' : 'inactive'}>{r.isActive ? 'Yes' : 'No'}</StatusBadge> },
  ];

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle}>
        <button onClick={openCreate} className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90">+ Add</button>
      </PageHeader>

      <div className="mb-4"><SearchBar value={search} onChange={setSearch} placeholder="Search title…" /></div>

      <DataTable columns={columns} rows={rows} loading={loading} empty="Nothing here yet."
        actions={r => (
          <div className="flex items-center gap-3">
            <button onClick={() => openEdit(r)} className="text-slate-600 font-semibold hover:underline">Edit</button>
            <button onClick={() => setDelTarget(r)} className="text-rose-600 font-semibold hover:underline">Delete</button>
          </div>
        )}
      />

      <FormModal open={formOpen} title={edit ? 'Edit item' : 'Add item'} onClose={() => setFormOpen(false)} onSubmit={submit} submitting={busy} submitLabel={edit ? 'Save' : 'Add'} wide>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Title" required><input className={inputClass} value={form.title} onChange={e => set('title', e.target.value)} /></Field>
          <Field label="Category"><input className={inputClass} placeholder="Brochures / Price list…" value={form.category || ''} onChange={e => set('category', e.target.value)} /></Field>
          <Field label="File type"><select className={inputClass} value={form.fileType} onChange={e => set('fileType', e.target.value)}>{FILE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></Field>
          <Field label="Sort order"><input type="number" className={inputClass} value={form.sortOrder} onChange={e => set('sortOrder', e.target.value)} /></Field>
        </div>
        <Field label="File / link URL" required hint="Cloudinary URL or any link"><input className={inputClass} value={form.url} onChange={e => set('url', e.target.value)} /></Field>
        <Field label="Description"><textarea className={inputClass} rows={2} value={form.description || ''} onChange={e => set('description', e.target.value)} /></Field>
        <Field label="Thumbnail"><ImageUploader value={form.thumbnailUrl} onChange={url => set('thumbnailUrl', url)} label="Resource thumbnail" /></Field>
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={!!form.isActive} onChange={e => set('isActive', e.target.checked)} /> Active (visible to agents)</label>
      </FormModal>

      <ConfirmDialog open={!!delTarget} title="Delete item?" message={`Remove "${delTarget?.title}"?`} confirmLabel="Delete" danger busy={busy} onCancel={() => setDelTarget(null)} onConfirm={confirmDelete} />
    </div>
  );
}
