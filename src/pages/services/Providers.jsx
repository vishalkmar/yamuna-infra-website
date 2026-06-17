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

const blank = (categoryId) => ({
  categoryId, name: '', tagline: '', imageUrl: '', phone: '', gender: 'any',
  rating: 0, experienceYears: 0, priceFrom: 0, isActive: true, featured: false, sortOrder: 0,
});

export default function Providers() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [catName, setCatName] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        api.get('/admin/services/providers', { params: { categoryId } }),
        api.get('/admin/services/categories'),
      ]);
      setRows(pRes.data.data);
      setCatName((cRes.data.data.find(c => String(c.id) === String(categoryId)) || {}).name || 'Category');
    } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [categoryId, toast]);

  useEffect(() => { load(); }, [load]);

  const setF = (k, v) => setModal(m => ({ ...m, form: { ...m.form, [k]: v } }));

  async function save() {
    const { mode, form, id } = modal;
    setBusy(true);
    try {
      if (mode === 'create') await api.post('/admin/services/providers', form);
      else await api.put(`/admin/services/providers/${id}`, form);
      toast.success(`Provider ${mode === 'create' ? 'created' : 'updated'}`);
      setModal(null); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.delete(`/admin/services/providers/${del.id}`);
      toast.success('Provider deleted'); setDel(null); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const columns = [
    { key: 'name', header: 'Provider', render: r => (
      <div className="flex items-center gap-2">
        {r.imageUrl
          ? <img src={r.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover" />
          : <div className="w-9 h-9 rounded-lg bg-slate-100 grid place-items-center text-slate-400">🛎️</div>}
        <div>
          <div className="font-medium text-slate-800">{r.name} {r.featured ? '⭐' : ''}</div>
          <div className="text-xs text-slate-400">{r.tagline}</div>
        </div>
      </div>
    ) },
    { key: 'phone', header: 'Phone' },
    { key: 'gender', header: 'Gender' },
    { key: 'rating', header: 'Rating' },
    { key: 'priceFrom', header: 'From', render: r => fmtMoney(r.priceFrom) },
    { key: 'offeringCount', header: 'Offerings' },
    { key: 'isActive', header: 'Status', render: r => <StatusBadge status={r.isActive ? 'active' : 'inactive'}>{r.isActive ? 'Active' : 'Hidden'}</StatusBadge> },
  ];

  return (
    <div>
      <button onClick={() => navigate('/services')} className="text-sm text-slate-500 hover:text-slate-700 mb-3">← Back to categories</button>
      <PageHeader title={`${catName} — Providers`} subtitle={`${rows.length} provider${rows.length === 1 ? '' : 's'}`} actionLabel="+ Add provider" onAction={() => setModal({ mode: 'create', form: blank(Number(categoryId)) })} />

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        empty="No providers in this category yet"
        actions={r => (
          <div className="flex justify-end gap-3">
            <button onClick={() => navigate(`/services/providers/${r.id}/offerings`)} className="text-brand-primary font-semibold hover:underline">Offerings</button>
            <button onClick={() => setModal({ mode: 'edit', id: r.id, form: { categoryId: r.categoryId, name: r.name, tagline: r.tagline || '', imageUrl: r.imageUrl || '', phone: r.phone || '', gender: r.gender, rating: Number(r.rating), experienceYears: r.experienceYears, priceFrom: Number(r.priceFrom), isActive: !!r.isActive, featured: !!r.featured, sortOrder: r.sortOrder } })} className="text-slate-600 hover:underline">Edit</button>
            <button onClick={() => setDel(r)} className="text-rose-600 hover:underline">Delete</button>
          </div>
        )}
      />

      {modal && (
        <FormModal open wide title={modal.mode === 'create' ? 'Add provider' : 'Edit provider'} onClose={() => setModal(null)} onSubmit={save} submitting={busy}>
          <Field label="Name" required><input className={inputClass} value={modal.form.name} onChange={e => setF('name', e.target.value)} /></Field>
          <Field label="Tagline"><input className={inputClass} value={modal.form.tagline} onChange={e => setF('tagline', e.target.value)} /></Field>
          <ImageUploader label="Photo / logo" value={modal.form.imageUrl} onChange={v => setF('imageUrl', v)} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone"><input className={inputClass} value={modal.form.phone} onChange={e => setF('phone', e.target.value)} /></Field>
            <Field label="Gender">
              <select className={inputClass} value={modal.form.gender} onChange={e => setF('gender', e.target.value)}>
                <option value="any">Any</option><option value="male">Male</option><option value="female">Female</option>
              </select>
            </Field>
            <Field label="Rating (0–5)"><input type="number" step="0.1" min="0" max="5" className={inputClass} value={modal.form.rating} onChange={e => setF('rating', Number(e.target.value))} /></Field>
            <Field label="Experience (years)"><input type="number" min="0" className={inputClass} value={modal.form.experienceYears} onChange={e => setF('experienceYears', Number(e.target.value))} /></Field>
            <Field label="Price from (₹)"><input type="number" min="0" className={inputClass} value={modal.form.priceFrom} onChange={e => setF('priceFrom', Number(e.target.value))} /></Field>
            <Field label="Sort order"><input type="number" className={inputClass} value={modal.form.sortOrder} onChange={e => setF('sortOrder', Number(e.target.value))} /></Field>
          </div>
          <div className="flex gap-5">
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={modal.form.isActive} onChange={e => setF('isActive', e.target.checked)} /> Active</label>
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={modal.form.featured} onChange={e => setF('featured', e.target.checked)} /> Featured ⭐</label>
          </div>
        </FormModal>
      )}

      <ConfirmDialog open={!!del} title="Delete provider?" message={del ? `“${del.name}” and its offerings will be removed.` : ''} confirmLabel="Delete" danger busy={busy} onCancel={() => setDel(null)} onConfirm={remove} />
    </div>
  );
}
