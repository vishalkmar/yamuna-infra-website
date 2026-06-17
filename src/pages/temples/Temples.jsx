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

const CROWD = ['low', 'moderate', 'high', 'very_high'];
const blank = {
  name: '', city: 'Vrindavan', rating: 0, crowdStatus: 'moderate', distanceKm: 0, imageUrl: '',
  aartiTimes: '', mapsUrl: '', donationUrl: '', vipAvailable: false, description: '',
  isActive: true, featured: false, sortOrder: 0,
};

export default function Temples() {
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/admin/temples'); setRows(data.data); }
    catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  const setF = (k, v) => setModal(m => ({ ...m, form: { ...m.form, [k]: v } }));

  async function save() {
    const { mode, form, id } = modal;
    setBusy(true);
    try {
      if (mode === 'create') await api.post('/admin/temples', form);
      else await api.put(`/admin/temples/${id}`, form);
      toast.success(`Temple ${mode === 'create' ? 'created' : 'updated'}`);
      setModal(null); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    try { await api.delete(`/admin/temples/${del.id}`); toast.success('Temple deleted'); setDel(null); load(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const columns = [
    { key: 'name', header: 'Temple', render: r => (
      <div className="flex items-center gap-2">
        {r.imageUrl
          ? <img src={r.imageUrl} alt="" className="w-12 h-9 rounded object-cover" />
          : <div className="w-12 h-9 rounded bg-slate-100 grid place-items-center">🛕</div>}
        <div>
          <div className="font-medium text-slate-800">{r.name} {r.featured ? '📌' : ''}</div>
          <div className="text-xs text-slate-400">{r.city} · {r.distanceKm} km</div>
        </div>
      </div>
    ) },
    { key: 'rating', header: 'Rating', render: r => `⭐ ${r.rating}` },
    { key: 'crowdStatus', header: 'Crowd', render: r => <span className="capitalize">{String(r.crowdStatus).replace('_', ' ')}</span> },
    { key: 'vipAvailable', header: 'VIP', render: r => (r.vipAvailable ? '✅' : '—') },
    { key: 'festivalCount', header: 'Festivals' },
    { key: 'isActive', header: 'Status', render: r => <StatusBadge status={r.isActive ? 'active' : 'inactive'}>{r.isActive ? 'Active' : 'Hidden'}</StatusBadge> },
  ];

  return (
    <div>
      <PageHeader title="Temple Directory" subtitle={`${rows.length} temple${rows.length === 1 ? '' : 's'}`} actionLabel="+ Add temple" onAction={() => setModal({ mode: 'create', form: { ...blank } })}>
        <Link to="/temples/darshan" className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">Darshan bookings</Link>
      </PageHeader>

      <DataTable columns={columns} rows={rows} loading={loading} empty="No temples yet"
        actions={r => (
          <div className="flex justify-end gap-3">
            <button onClick={() => navigate(`/temples/${r.id}/festivals`)} className="text-brand-primary font-semibold hover:underline">Festivals</button>
            <button onClick={() => setModal({ mode: 'edit', id: r.id, form: { name: r.name, city: r.city || '', rating: Number(r.rating), crowdStatus: r.crowdStatus, distanceKm: Number(r.distanceKm), imageUrl: r.imageUrl || '', aartiTimes: r.aartiTimes || '', mapsUrl: r.mapsUrl || '', donationUrl: r.donationUrl || '', vipAvailable: !!r.vipAvailable, description: r.description || '', isActive: !!r.isActive, featured: !!r.featured, sortOrder: r.sortOrder } })} className="text-slate-600 hover:underline">Edit</button>
            <button onClick={() => setDel(r)} className="text-rose-600 hover:underline">Delete</button>
          </div>
        )}
      />

      {modal && (
        <FormModal open wide title={modal.mode === 'create' ? 'Add temple' : 'Edit temple'} onClose={() => setModal(null)} onSubmit={save} submitting={busy}>
          <Field label="Name" required><input className={inputClass} value={modal.form.name} onChange={e => setF('name', e.target.value)} /></Field>
          <ImageUploader label="Photo" value={modal.form.imageUrl} onChange={v => setF('imageUrl', v)} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="City"><input className={inputClass} value={modal.form.city} onChange={e => setF('city', e.target.value)} /></Field>
            <Field label="Distance (km)"><input type="number" step="0.1" min="0" className={inputClass} value={modal.form.distanceKm} onChange={e => setF('distanceKm', Number(e.target.value))} /></Field>
            <Field label="Rating (0–5)"><input type="number" step="0.1" min="0" max="5" className={inputClass} value={modal.form.rating} onChange={e => setF('rating', Number(e.target.value))} /></Field>
            <Field label="Crowd status">
              <select className={inputClass} value={modal.form.crowdStatus} onChange={e => setF('crowdStatus', e.target.value)}>
                {CROWD.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Aarti / darshan timings"><input className={inputClass} value={modal.form.aartiTimes} onChange={e => setF('aartiTimes', e.target.value)} placeholder="Shringar 9 AM, Rajbhog 12 PM…" /></Field>
          <Field label="Google Maps URL"><input className={inputClass} value={modal.form.mapsUrl} onChange={e => setF('mapsUrl', e.target.value)} /></Field>
          <Field label="Donation URL"><input className={inputClass} value={modal.form.donationUrl} onChange={e => setF('donationUrl', e.target.value)} /></Field>
          <Field label="Description"><textarea rows={3} className={inputClass} value={modal.form.description} onChange={e => setF('description', e.target.value)} /></Field>
          <Field label="Sort order"><input type="number" className={inputClass} value={modal.form.sortOrder} onChange={e => setF('sortOrder', Number(e.target.value))} /></Field>
          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={modal.form.vipAvailable} onChange={e => setF('vipAvailable', e.target.checked)} /> VIP available</label>
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={modal.form.featured} onChange={e => setF('featured', e.target.checked)} /> Featured 📌</label>
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={modal.form.isActive} onChange={e => setF('isActive', e.target.checked)} /> Active</label>
          </div>
        </FormModal>
      )}

      <ConfirmDialog open={!!del} title="Delete temple?" message={del ? `“${del.name}” and its festivals will be removed.` : ''} confirmLabel="Delete" danger busy={busy} onCancel={() => setDel(null)} onConfirm={remove} />
    </div>
  );
}
