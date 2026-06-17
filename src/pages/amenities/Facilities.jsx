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
import { fmtMoney } from '../../lib/format';

const blank = {
  code: '', categoryId: '', name: '', icon: '', imageUrl: '', capacity: 0, deposit: 0, hourlyRate: 0,
  location: '', features: '', description: '', openTime: '', closeTime: '', slotMinutes: 120, isActive: true, sortOrder: 0,
};

export default function Facilities() {
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [cats, setCats] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter ? { categoryId: filter } : {};
      const [fRes, cRes] = await Promise.all([
        api.get('/admin/amenities', { params }),
        api.get('/admin/amenities/categories'),
      ]);
      setRows(fRes.data.data); setCats(cRes.data.data);
    } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [filter, toast]);

  useEffect(() => { load(); }, [load]);
  const setF = (k, v) => setModal(m => ({ ...m, form: { ...m.form, [k]: v } }));

  async function save() {
    const { mode, form, id } = modal;
    const payload = { ...form, categoryId: form.categoryId ? Number(form.categoryId) : null };
    setBusy(true);
    try {
      if (mode === 'create') await api.post('/admin/amenities', payload);
      else await api.put(`/admin/amenities/${id}`, payload);
      toast.success(`Facility ${mode === 'create' ? 'created' : 'updated'}`);
      setModal(null); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    try { await api.delete(`/admin/amenities/${del.id}`); toast.success('Facility deleted'); setDel(null); load(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const columns = [
    { key: 'name', header: 'Facility', render: r => (
      <div className="flex items-center gap-2">
        {r.imageUrl ? <img src={r.imageUrl} alt="" className="w-12 h-9 rounded object-cover" /> : <div className="w-12 h-9 rounded bg-slate-100 grid place-items-center">{r.icon || '🎯'}</div>}
        <div>
          <div className="font-medium text-slate-800">{r.name}</div>
          <div className="text-xs text-slate-400">{r.categoryName || 'Uncategorised'} · {r.location || '—'}</div>
        </div>
      </div>
    ) },
    { key: 'capacity', header: 'Capacity' },
    { key: 'deposit', header: 'Deposit', render: r => fmtMoney(r.deposit) },
    { key: 'hourlyRate', header: 'Rate/hr', render: r => fmtMoney(r.hourlyRate) },
    { key: 'slotMinutes', header: 'Slot', render: r => `${r.slotMinutes}m` },
    { key: 'blackoutCount', header: 'Blackouts' },
    { key: 'isActive', header: 'Status', render: r => <StatusBadge status={r.isActive ? 'active' : 'inactive'}>{r.isActive ? 'Active' : 'Hidden'}</StatusBadge> },
  ];

  return (
    <div>
      <PageHeader title="Amenities & Clubhouse" subtitle={`${rows.length} facilit${rows.length === 1 ? 'y' : 'ies'}`} actionLabel="+ Add facility" onAction={() => setModal({ mode: 'create', form: { ...blank } })}>
        <Link to="/amenities/categories" className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">Categories</Link>
        <Link to="/amenities/bookings" className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">Bookings</Link>
      </PageHeader>

      <div className="mb-4">
        <select value={filter} onChange={e => setFilter(e.target.value)} className="text-sm border border-slate-300 rounded-lg px-3 py-2">
          <option value="">All categories</option>
          {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <DataTable columns={columns} rows={rows} loading={loading} empty="No facilities yet"
        actions={r => (
          <div className="flex justify-end gap-3">
            <button onClick={() => navigate(`/amenities/${r.id}/blackouts`)} className="text-brand-primary font-semibold hover:underline">Blackouts</button>
            <button onClick={() => setModal({ mode: 'edit', id: r.id, form: { categoryId: r.categoryId || '', name: r.name, icon: r.icon || '', imageUrl: r.imageUrl || '', capacity: r.capacity, deposit: Number(r.deposit), hourlyRate: Number(r.hourlyRate), location: r.location || '', features: r.features || '', description: r.description || '', openTime: r.openTime || '', closeTime: r.closeTime || '', slotMinutes: r.slotMinutes, isActive: !!r.isActive, sortOrder: r.sortOrder } })} className="text-slate-600 hover:underline">Edit</button>
            <button onClick={() => setDel(r)} className="text-rose-600 hover:underline">Delete</button>
          </div>
        )}
      />

      {modal && (
        <FormModal open wide title={modal.mode === 'create' ? 'Add facility' : 'Edit facility'} onClose={() => setModal(null)} onSubmit={save} submitting={busy}>
          {modal.mode === 'create' && (
            <Field label="Code" hint="Short key (e.g. HALL). Cannot change later." required>
              <input className={inputClass} value={modal.form.code} onChange={e => setF('code', e.target.value.toUpperCase().replace(/\s+/g, '_'))} />
            </Field>
          )}
          <Field label="Name" required><input className={inputClass} value={modal.form.name} onChange={e => setF('name', e.target.value)} /></Field>
          <Field label="Category">
            <select className={inputClass} value={modal.form.categoryId} onChange={e => setF('categoryId', e.target.value)}>
              <option value="">Uncategorised</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <ImageUploader label="Photo" value={modal.form.imageUrl} onChange={v => setF('imageUrl', v)} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Icon (emoji)"><input className={inputClass} value={modal.form.icon} onChange={e => setF('icon', e.target.value)} /></Field>
            <Field label="Location"><input className={inputClass} value={modal.form.location} onChange={e => setF('location', e.target.value)} placeholder="Block A, Ground floor" /></Field>
            <Field label="Capacity"><input type="number" min="0" className={inputClass} value={modal.form.capacity} onChange={e => setF('capacity', Number(e.target.value))} /></Field>
            <Field label="Deposit (₹)"><input type="number" min="0" className={inputClass} value={modal.form.deposit} onChange={e => setF('deposit', Number(e.target.value))} /></Field>
            <Field label="Hourly rate (₹)"><input type="number" min="0" className={inputClass} value={modal.form.hourlyRate} onChange={e => setF('hourlyRate', Number(e.target.value))} /></Field>
            <Field label="Slot length (minutes)"><input type="number" min="15" className={inputClass} value={modal.form.slotMinutes} onChange={e => setF('slotMinutes', Number(e.target.value))} /></Field>
            <Field label="Opens"><input type="time" className={inputClass} value={modal.form.openTime} onChange={e => setF('openTime', e.target.value)} /></Field>
            <Field label="Closes"><input type="time" className={inputClass} value={modal.form.closeTime} onChange={e => setF('closeTime', e.target.value)} /></Field>
          </div>
          <Field label="Features" hint="Comma-separated"><input className={inputClass} value={modal.form.features} onChange={e => setF('features', e.target.value)} placeholder="AC, Stage, Parking, Sound system" /></Field>
          <Field label="Description"><textarea rows={2} className={inputClass} value={modal.form.description} onChange={e => setF('description', e.target.value)} /></Field>
          <Field label="Sort order"><input type="number" className={inputClass} value={modal.form.sortOrder} onChange={e => setF('sortOrder', Number(e.target.value))} /></Field>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={modal.form.isActive} onChange={e => setF('isActive', e.target.checked)} /> Active (bookable in app)</label>
        </FormModal>
      )}

      <ConfirmDialog open={!!del} title="Delete facility?" message={del ? `“${del.name}” and its blackout dates will be removed.` : ''} confirmLabel="Delete" danger busy={busy} onCancel={() => setDel(null)} onConfirm={remove} />
    </div>
  );
}
