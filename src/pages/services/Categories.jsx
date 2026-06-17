import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormModal, { Field, inputClass } from '../../components/FormModal';
import ImageUploader from '../../components/ImageUploader';

const blank = { code: '', name: '', icon: '', imageUrl: '', isActive: true, sortOrder: 0 };

export default function Categories() {
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { mode:'create'|'edit', form }
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/services/categories');
      setRows(data.data);
    } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const setF = (k, v) => setModal(m => ({ ...m, form: { ...m.form, [k]: v } }));

  async function save() {
    const { mode, form, id } = modal;
    setBusy(true);
    try {
      if (mode === 'create') await api.post('/admin/services/categories', form);
      else await api.put(`/admin/services/categories/${id}`, form);
      toast.success(`Category ${mode === 'create' ? 'created' : 'updated'}`);
      setModal(null);
      load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.delete(`/admin/services/categories/${del.id}`);
      toast.success('Category deleted');
      setDel(null);
      load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const columns = [
    { key: 'icon', header: '', render: r => <span className="text-xl">{r.icon || '🛎️'}</span> },
    { key: 'name', header: 'Category', render: r => (
      <div className="flex items-center gap-2">
        {r.imageUrl && <img src={r.imageUrl} alt="" className="w-8 h-8 rounded object-cover" />}
        <span className="font-medium text-slate-800">{r.name}</span>
        <code className="text-xs text-slate-400">{r.code}</code>
      </div>
    ) },
    { key: 'providerCount', header: 'Providers' },
    { key: 'isActive', header: 'Status', render: r => <StatusBadge status={r.isActive ? 'active' : 'inactive'}>{r.isActive ? 'Active' : 'Hidden'}</StatusBadge> },
    { key: 'sortOrder', header: 'Order' },
  ];

  return (
    <div>
      <PageHeader title="Services & Providers" subtitle="Categories → providers → offerings" actionLabel="+ Add category" onAction={() => setModal({ mode: 'create', form: { ...blank } })}>
        <Link to="/services/bookings" className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">View bookings</Link>
      </PageHeader>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        empty="No categories yet"
        actions={r => (
          <div className="flex justify-end gap-3">
            <button onClick={() => navigate(`/services/categories/${r.id}/providers`)} className="text-brand-primary font-semibold hover:underline">Providers</button>
            <button onClick={() => setModal({ mode: 'edit', id: r.id, form: { code: r.code, name: r.name, icon: r.icon || '', imageUrl: r.imageUrl || '', isActive: !!r.isActive, sortOrder: r.sortOrder } })} className="text-slate-600 hover:underline">Edit</button>
            <button onClick={() => setDel(r)} className="text-rose-600 hover:underline">Delete</button>
          </div>
        )}
      />

      {modal && (
        <FormModal open title={modal.mode === 'create' ? 'Add category' : 'Edit category'} onClose={() => setModal(null)} onSubmit={save} submitting={busy}>
          {modal.mode === 'create' && (
            <Field label="Code" hint="Lowercase key the app reads by (e.g. cleaning). Cannot change later." required>
              <input className={inputClass} value={modal.form.code} onChange={e => setF('code', e.target.value.toLowerCase().replace(/\s+/g, '_'))} />
            </Field>
          )}
          <Field label="Name" required><input className={inputClass} value={modal.form.name} onChange={e => setF('name', e.target.value)} /></Field>
          <Field label="Icon (emoji)"><input className={inputClass} value={modal.form.icon} onChange={e => setF('icon', e.target.value)} placeholder="🧹" /></Field>
          <ImageUploader label="Cover image" value={modal.form.imageUrl} onChange={v => setF('imageUrl', v)} />
          <Field label="Sort order"><input type="number" className={inputClass} value={modal.form.sortOrder} onChange={e => setF('sortOrder', Number(e.target.value))} /></Field>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={modal.form.isActive} onChange={e => setF('isActive', e.target.checked)} /> Active (visible in app)
          </label>
        </FormModal>
      )}

      <ConfirmDialog
        open={!!del}
        title="Delete category?"
        message={del ? `“${del.name}” will be removed. Categories with providers can’t be deleted.` : ''}
        confirmLabel="Delete"
        danger
        busy={busy}
        onCancel={() => setDel(null)}
        onConfirm={remove}
      />
    </div>
  );
}
