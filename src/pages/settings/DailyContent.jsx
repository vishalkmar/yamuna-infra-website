import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormModal, { Field, inputClass } from '../../components/FormModal';

const KINDS = ['quote', 'bhajan', 'tip'];
const blank = { kind: 'quote', text: '', author: '', isActive: true, sortOrder: 0 };

export default function DailyContent() {
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/admin/settings/daily-content'); setRows(data.data); }
    catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  const setF = (k, v) => setModal(m => ({ ...m, form: { ...m.form, [k]: v } }));

  async function save() {
    const { mode, form, id } = modal;
    setBusy(true);
    try {
      if (mode === 'create') await api.post('/admin/settings/daily-content', form);
      else await api.put(`/admin/settings/daily-content/${id}`, form);
      toast.success(`Content ${mode === 'create' ? 'added' : 'updated'}`);
      setModal(null); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    try { await api.delete(`/admin/settings/daily-content/${del.id}`); toast.success('Deleted'); setDel(null); load(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const columns = [
    { key: 'kind', header: 'Type', render: r => <span className="capitalize text-xs bg-slate-100 px-2 py-0.5 rounded">{r.kind}</span> },
    { key: 'text', header: 'Content', render: r => <span className="text-slate-800">{r.text}</span> },
    { key: 'author', header: 'Author', render: r => r.author || '—' },
    { key: 'isActive', header: 'Status', render: r => <StatusBadge status={r.isActive ? 'active' : 'inactive'}>{r.isActive ? 'Active' : 'Hidden'}</StatusBadge> },
  ];

  return (
    <div>
      <button onClick={() => navigate('/settings')} className="text-sm text-slate-500 hover:text-slate-700 mb-3">← Back to settings</button>
      <PageHeader title="Daily Content" subtitle="Quotes / bhajans / tips shown in the app" actionLabel="+ Add" onAction={() => setModal({ mode: 'create', form: { ...blank } })} />

      <DataTable columns={columns} rows={rows} loading={loading} empty="No daily content yet"
        actions={r => (
          <div className="flex justify-end gap-3">
            <button onClick={() => setModal({ mode: 'edit', id: r.id, form: { kind: r.kind, text: r.text, author: r.author || '', isActive: !!r.isActive, sortOrder: r.sortOrder } })} className="text-slate-600 hover:underline">Edit</button>
            <button onClick={() => setDel(r)} className="text-rose-600 hover:underline">Delete</button>
          </div>
        )}
      />

      {modal && (
        <FormModal open title={modal.mode === 'create' ? 'Add content' : 'Edit content'} onClose={() => setModal(null)} onSubmit={save} submitting={busy}>
          <Field label="Type"><select className={inputClass} value={modal.form.kind} onChange={e => setF('kind', e.target.value)}>{KINDS.map(k => <option key={k} value={k} className="capitalize">{k}</option>)}</select></Field>
          <Field label="Text" required><textarea rows={3} className={inputClass} value={modal.form.text} onChange={e => setF('text', e.target.value)} /></Field>
          <Field label="Author / source"><input className={inputClass} value={modal.form.author} onChange={e => setF('author', e.target.value)} placeholder="Bhagavad Gita" /></Field>
          <Field label="Sort order"><input type="number" className={inputClass} value={modal.form.sortOrder} onChange={e => setF('sortOrder', Number(e.target.value))} /></Field>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={modal.form.isActive} onChange={e => setF('isActive', e.target.checked)} /> Active</label>
        </FormModal>
      )}

      <ConfirmDialog open={!!del} title="Delete content?" message={del ? `"${del.text}" will be removed.` : ''} confirmLabel="Delete" danger busy={busy} onCancel={() => setDel(null)} onConfirm={remove} />
    </div>
  );
}
