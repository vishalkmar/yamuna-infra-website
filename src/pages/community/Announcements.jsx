import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormModal, { Field, inputClass } from '../../components/FormModal';
import ImageUploader from '../../components/ImageUploader';
import { fmtDate } from '../../lib/format';

const blank = { title: '', body: '', imageUrl: '', category: 'general', pinned: false, isActive: true, expiresAt: '' };

export default function Announcements() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);
  const [broadcast, setBroadcast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/admin/community/announcements'); setRows(data.data); }
    catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  const setF = (k, v) => setModal(m => ({ ...m, form: { ...m.form, [k]: v } }));

  async function save() {
    const { mode, form, id } = modal;
    const payload = { ...form, expiresAt: form.expiresAt || null };
    setBusy(true);
    try {
      if (mode === 'create') await api.post('/admin/community/announcements', payload);
      else await api.put(`/admin/community/announcements/${id}`, payload);
      toast.success(`Announcement ${mode === 'create' ? 'posted' : 'updated'}`);
      setModal(null); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    try { await api.delete(`/admin/community/announcements/${del.id}`); toast.success('Announcement deleted'); setDel(null); load(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  // A12.4 — push this announcement to every resident's notification feed.
  async function doBroadcast() {
    setBusy(true);
    try {
      const { data } = await api.post('/admin/notifications', {
        title: broadcast.title, body: broadcast.body, category: broadcast.category || 'announcement',
        icon: '📢', targetType: 'all',
      });
      toast.success(data.message || 'Broadcast sent');
      setBroadcast(null);
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const columns = [
    { key: 'title', header: 'Announcement', render: r => (
      <div className="flex items-center gap-2">
        {r.imageUrl && <img src={r.imageUrl} alt="" className="w-12 h-9 rounded object-cover" />}
        <div>
          <div className="font-medium text-slate-800">{r.pinned ? '📌 ' : ''}{r.title}</div>
          <div className="text-xs text-slate-400 line-clamp-1">{r.body}</div>
        </div>
      </div>
    ) },
    { key: 'category', header: 'Category', render: r => <span className="capitalize">{r.category || '—'}</span> },
    { key: 'postedAt', header: 'Posted', render: r => fmtDate(r.postedAt) },
    { key: 'isActive', header: 'Status', render: r => <StatusBadge status={r.isActive ? 'active' : 'inactive'}>{r.isActive ? 'Live' : 'Hidden'}</StatusBadge> },
  ];

  return (
    <div>
      <PageHeader title="Community & Visitors" subtitle="Announcements feed" actionLabel="+ Post announcement" onAction={() => setModal({ mode: 'create', form: { ...blank } })}>
        <Link to="/community/events" className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">Events</Link>
        <Link to="/community/visitors" className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">Visitors</Link>
      </PageHeader>

      <DataTable columns={columns} rows={rows} loading={loading} empty="No announcements yet"
        actions={r => (
          <div className="flex justify-end gap-3">
            <button onClick={() => setBroadcast(r)} className="text-brand-primary font-semibold hover:underline">📢 Broadcast</button>
            <button onClick={() => setModal({ mode: 'edit', id: r.id, form: { title: r.title, body: r.body, imageUrl: r.imageUrl || '', category: r.category || '', pinned: !!r.pinned, isActive: !!r.isActive, expiresAt: r.expiresAt ? String(r.expiresAt).slice(0, 10) : '' } })} className="text-slate-600 hover:underline">Edit</button>
            <button onClick={() => setDel(r)} className="text-rose-600 hover:underline">Delete</button>
          </div>
        )}
      />

      {modal && (
        <FormModal open title={modal.mode === 'create' ? 'Post announcement' : 'Edit announcement'} onClose={() => setModal(null)} onSubmit={save} submitting={busy}>
          <Field label="Title" required><input className={inputClass} value={modal.form.title} onChange={e => setF('title', e.target.value)} /></Field>
          <Field label="Body" required><textarea rows={4} className={inputClass} value={modal.form.body} onChange={e => setF('body', e.target.value)} /></Field>
          <ImageUploader label="Image (optional)" value={modal.form.imageUrl} onChange={v => setF('imageUrl', v)} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category"><input className={inputClass} value={modal.form.category} onChange={e => setF('category', e.target.value)} placeholder="maintenance / event / general" /></Field>
            <Field label="Expires on (optional)"><input type="date" className={inputClass} value={modal.form.expiresAt} onChange={e => setF('expiresAt', e.target.value)} /></Field>
          </div>
          <div className="flex gap-5">
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={modal.form.pinned} onChange={e => setF('pinned', e.target.checked)} /> Pin to top 📌</label>
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={modal.form.isActive} onChange={e => setF('isActive', e.target.checked)} /> Live</label>
          </div>
        </FormModal>
      )}

      <ConfirmDialog open={!!del} title="Delete announcement?" message={del ? `“${del.title}” will be removed.` : ''} confirmLabel="Delete" danger busy={busy} onCancel={() => setDel(null)} onConfirm={remove} />

      <ConfirmDialog open={!!broadcast} title="Broadcast to all residents?" message={broadcast ? `“${broadcast.title}” will be pushed to every resident's notification feed.` : ''} confirmLabel="Send broadcast" busy={busy} onCancel={() => setBroadcast(null)} onConfirm={doBroadcast} />
    </div>
  );
}
