import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormModal, { Field, inputClass } from '../../components/FormModal';
import ImageUploader from '../../components/ImageUploader';
import { fmtMoney } from '../../lib/format';

const blank = { code: '', name: '', icon: '', imageUrl: '', description: '', price: 0, durationMin: 60, isPackage: false, packageDays: 0, isActive: true, sortOrder: 0 };

export default function WellnessActivities() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [category, setCategory] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/wellness/categories/${categoryId}/therapies`);
      setCategory(data.data.category); setRows(data.data.therapies);
    } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [categoryId, toast]);

  useEffect(() => { load(); }, [load]);
  const setF = (k, v) => setModal(m => ({ ...m, form: { ...m.form, [k]: v } }));

  async function save() {
    const { mode, form, id } = modal;
    setBusy(true);
    try {
      if (mode === 'create') await api.post(`/admin/wellness/categories/${categoryId}/therapies`, form);
      else await api.put(`/admin/wellness/therapies/${id}`, { ...form, categoryId: Number(categoryId) });
      toast.success(`Activity ${mode === 'create' ? 'created' : 'updated'}`);
      setModal(null); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    try { await api.delete(`/admin/wellness/therapies/${del.id}`); toast.success('Activity deleted'); setDel(null); load(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const columns = [
    { key: 'name', header: 'Activity', render: r => (
      <div className="flex items-center gap-2">
        {r.imageUrl ? <img src={r.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 rounded-lg bg-slate-100 grid place-items-center">{r.icon || '🧘'}</div>}
        <div>
          <div className="font-medium text-slate-800">{r.name} {r.isPackage ? `📦 ${r.packageDays}d` : ''}</div>
          <div className="text-xs text-slate-400">{r.description}</div>
        </div>
      </div>
    ) },
    { key: 'price', header: 'Price', render: r => fmtMoney(r.price) },
    { key: 'durationMin', header: 'Duration', render: r => `${r.durationMin} min` },
    { key: 'isActive', header: 'Status', render: r => <StatusBadge status={r.isActive ? 'active' : 'inactive'}>{r.isActive ? 'Active' : 'Hidden'}</StatusBadge> },
  ];

  return (
    <div>
      <button onClick={() => navigate('/wellness')} className="text-sm text-slate-500 hover:text-slate-700 mb-3">← Back to categories</button>
      <PageHeader title={`${category?.name || 'Category'} — Activities`} subtitle={`${rows.length} activit${rows.length === 1 ? 'y' : 'ies'}`} actionLabel="+ Add activity" onAction={() => setModal({ mode: 'create', form: { ...blank } })} />

      <DataTable columns={columns} rows={rows} loading={loading} empty="No activities yet — add the services under this category"
        actions={r => (
          <div className="flex justify-end gap-3">
            <button onClick={() => setModal({ mode: 'edit', id: r.id, form: { name: r.name, icon: r.icon || '', imageUrl: r.imageUrl || '', description: r.description || '', price: Number(r.price), durationMin: r.durationMin, isPackage: !!r.isPackage, packageDays: r.packageDays || 0, isActive: !!r.isActive, sortOrder: r.sortOrder } })} className="text-slate-600 hover:underline">Edit</button>
            <button onClick={() => setDel(r)} className="text-rose-600 hover:underline">Delete</button>
          </div>
        )}
      />

      {modal && (
        <FormModal open title={modal.mode === 'create' ? 'Add activity' : 'Edit activity'} onClose={() => setModal(null)} onSubmit={save} submitting={busy}>
          {modal.mode === 'create' && (
            <Field label="Code" hint="Short key (e.g. HATHA). Cannot change later." required>
              <input className={inputClass} value={modal.form.code} onChange={e => setF('code', e.target.value.toUpperCase().replace(/\s+/g, ''))} />
            </Field>
          )}
          <Field label="Name" required><input className={inputClass} value={modal.form.name} onChange={e => setF('name', e.target.value)} placeholder="e.g. Hatha Yoga" /></Field>
          <Field label="Icon (emoji)"><input className={inputClass} value={modal.form.icon} onChange={e => setF('icon', e.target.value)} /></Field>
          <ImageUploader label="Image" value={modal.form.imageUrl} onChange={v => setF('imageUrl', v)} />
          <Field label="Description"><textarea rows={2} className={inputClass} value={modal.form.description} onChange={e => setF('description', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price (₹)" required><input type="number" min="0" className={inputClass} value={modal.form.price} onChange={e => setF('price', Number(e.target.value))} /></Field>
            <Field label="Duration (min)"><input type="number" min="0" className={inputClass} value={modal.form.durationMin} onChange={e => setF('durationMin', Number(e.target.value))} /></Field>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={modal.form.isPackage} onChange={e => setF('isPackage', e.target.checked)} /> Multi-day package</label>
            {modal.form.isPackage && <Field label="Days"><input type="number" min="1" className={inputClass} value={modal.form.packageDays} onChange={e => setF('packageDays', Number(e.target.value))} /></Field>}
          </div>
          <Field label="Sort order"><input type="number" className={inputClass} value={modal.form.sortOrder} onChange={e => setF('sortOrder', Number(e.target.value))} /></Field>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={modal.form.isActive} onChange={e => setF('isActive', e.target.checked)} /> Active</label>
        </FormModal>
      )}

      <ConfirmDialog open={!!del} title="Delete activity?" message={del ? `“${del.name}” will be removed.` : ''} confirmLabel="Delete" danger busy={busy} onCancel={() => setDel(null)} onConfirm={remove} />
    </div>
  );
}
