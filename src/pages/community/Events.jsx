import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormModal, { Field, inputClass } from '../../components/FormModal';
import ImageUploader from '../../components/ImageUploader';
import { fmtDate } from '../../lib/format';

const blank = { title: '', imageUrl: '', description: '', eventDate: '', location: '', isActive: true, sortOrder: 0 };

export default function Events() {
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/admin/community/events'); setRows(data.data); }
    catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  const setF = (k, v) => setModal(m => ({ ...m, form: { ...m.form, [k]: v } }));

  async function save() {
    const { mode, form, id } = modal;
    const payload = { ...form, eventDate: form.eventDate || null };
    setBusy(true);
    try {
      if (mode === 'create') await api.post('/admin/community/events', payload);
      else await api.put(`/admin/community/events/${id}`, payload);
      toast.success(`Event ${mode === 'create' ? 'created' : 'updated'}`);
      setModal(null); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    try { await api.delete(`/admin/community/events/${del.id}`); toast.success('Event deleted'); setDel(null); load(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const columns = [
    { key: 'title', header: 'Event', render: r => (
      <div className="flex items-center gap-2">
        {r.imageUrl ? <img src={r.imageUrl} alt="" className="w-12 h-9 rounded object-cover" /> : <div className="w-12 h-9 rounded bg-slate-100 grid place-items-center">📅</div>}
        <div>
          <div className="font-medium text-slate-800">{r.title}</div>
          <div className="text-xs text-slate-400 line-clamp-1">{r.description}</div>
        </div>
      </div>
    ) },
    { key: 'eventDate', header: 'Date', render: r => fmtDate(r.eventDate) },
    { key: 'location', header: 'Location', render: r => r.location || '—' },
    { key: 'isActive', header: 'Status', render: r => <StatusBadge status={r.isActive ? 'active' : 'inactive'}>{r.isActive ? 'Active' : 'Hidden'}</StatusBadge> },
  ];

  return (
    <div>
      <button onClick={() => navigate('/community')} className="text-sm text-slate-500 hover:text-slate-700 mb-3">← Back to community</button>
      <PageHeader title="Events" subtitle={`${rows.length} event${rows.length === 1 ? '' : 's'}`} actionLabel="+ Add event" onAction={() => setModal({ mode: 'create', form: { ...blank } })} />

      <DataTable columns={columns} rows={rows} loading={loading} empty="No events yet"
        actions={r => (
          <div className="flex justify-end gap-3">
            <button onClick={() => setModal({ mode: 'edit', id: r.id, form: { title: r.title, imageUrl: r.imageUrl || '', description: r.description || '', eventDate: r.eventDate ? String(r.eventDate).slice(0, 10) : '', location: r.location || '', isActive: !!r.isActive, sortOrder: r.sortOrder } })} className="text-slate-600 hover:underline">Edit</button>
            <button onClick={() => setDel(r)} className="text-rose-600 hover:underline">Delete</button>
          </div>
        )}
      />

      {modal && (
        <FormModal open title={modal.mode === 'create' ? 'Add event' : 'Edit event'} onClose={() => setModal(null)} onSubmit={save} submitting={busy}>
          <Field label="Title" required><input className={inputClass} value={modal.form.title} onChange={e => setF('title', e.target.value)} /></Field>
          <ImageUploader label="Image" value={modal.form.imageUrl} onChange={v => setF('imageUrl', v)} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date"><input type="date" className={inputClass} value={modal.form.eventDate} onChange={e => setF('eventDate', e.target.value)} /></Field>
            <Field label="Location"><input className={inputClass} value={modal.form.location} onChange={e => setF('location', e.target.value)} /></Field>
          </div>
          <Field label="Description"><textarea rows={3} className={inputClass} value={modal.form.description} onChange={e => setF('description', e.target.value)} /></Field>
          <Field label="Sort order"><input type="number" className={inputClass} value={modal.form.sortOrder} onChange={e => setF('sortOrder', Number(e.target.value))} /></Field>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={modal.form.isActive} onChange={e => setF('isActive', e.target.checked)} /> Active</label>
        </FormModal>
      )}

      <ConfirmDialog open={!!del} title="Delete event?" message={del ? `“${del.title}” will be removed.` : ''} confirmLabel="Delete" danger busy={busy} onCancel={() => setDel(null)} onConfirm={remove} />
    </div>
  );
}
