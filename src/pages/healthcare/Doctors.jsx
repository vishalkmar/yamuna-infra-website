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
import { fmtMoney } from '../../lib/format';

const blank = {
  name: '', imageUrl: '', specialtyId: '', qualifications: '', description: '', experienceYears: 0,
  fee: 0, languages: '', rating: 0, phone: '', availableDays: '', slots: '', isActive: true, sortOrder: 0,
};

export default function Doctors() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [specs, setSpecs] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter ? { specialtyId: filter } : {};
      const [dRes, sRes] = await Promise.all([
        api.get('/admin/healthcare/doctors', { params }),
        api.get('/admin/healthcare/specialties'),
      ]);
      setRows(dRes.data.data); setSpecs(sRes.data.data);
    } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [filter, toast]);

  useEffect(() => { load(); }, [load]);
  const setF = (k, v) => setModal(m => ({ ...m, form: { ...m.form, [k]: v } }));

  async function save() {
    const { mode, form, id } = modal;
    const payload = { ...form, specialtyId: form.specialtyId ? Number(form.specialtyId) : null };
    setBusy(true);
    try {
      if (mode === 'create') await api.post('/admin/healthcare/doctors', payload);
      else await api.put(`/admin/healthcare/doctors/${id}`, payload);
      toast.success(`Doctor ${mode === 'create' ? 'created' : 'updated'}`);
      setModal(null); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    try { await api.delete(`/admin/healthcare/doctors/${del.id}`); toast.success('Doctor deleted'); setDel(null); load(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const columns = [
    { key: 'name', header: 'Doctor', render: r => (
      <div className="flex items-center gap-2">
        {r.imageUrl ? <img src={r.imageUrl} alt="" className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-slate-100 grid place-items-center">🩺</div>}
        <div>
          <div className="font-medium text-slate-800">{r.name}</div>
          <div className="text-xs text-slate-400">{r.qualifications || r.specialtyName}</div>
        </div>
      </div>
    ) },
    { key: 'specialtyName', header: 'Specialty', render: r => r.specialtyName || r.specialty || '—' },
    { key: 'experienceYears', header: 'Exp', render: r => `${r.experienceYears} yr` },
    { key: 'fee', header: 'Fee', render: r => fmtMoney(r.fee) },
    { key: 'rating', header: 'Rating', render: r => `⭐ ${r.rating}` },
    { key: 'isActive', header: 'Status', render: r => <StatusBadge status={r.isActive ? 'active' : 'inactive'}>{r.isActive ? 'Active' : 'Hidden'}</StatusBadge> },
  ];

  return (
    <div>
      <PageHeader title="Doctors & Healthcare" subtitle={`${rows.length} doctor${rows.length === 1 ? '' : 's'}`} actionLabel="+ Add doctor" onAction={() => setModal({ mode: 'create', form: { ...blank } })}>
        <Link to="/healthcare/specialties" className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">Specialties</Link>
        <Link to="/healthcare/appointments" className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">Appointments</Link>
        <Link to="/healthcare/medicine" className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">Medicine orders</Link>
      </PageHeader>

      <div className="mb-4">
        <select value={filter} onChange={e => setFilter(e.target.value)} className="text-sm border border-slate-300 rounded-lg px-3 py-2">
          <option value="">All specialties</option>
          {specs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <DataTable columns={columns} rows={rows} loading={loading} empty="No doctors yet"
        actions={r => (
          <div className="flex justify-end gap-3">
            <button onClick={() => setModal({ mode: 'edit', id: r.id, form: { name: r.name, imageUrl: r.imageUrl || '', specialtyId: r.specialtyId || '', qualifications: r.qualifications || '', description: r.description || '', experienceYears: r.experienceYears, fee: Number(r.fee), languages: r.languages || '', rating: Number(r.rating), phone: r.phone || '', availableDays: r.availableDays || '', slots: r.slots || '', isActive: !!r.isActive, sortOrder: r.sortOrder } })} className="text-slate-600 hover:underline">Edit</button>
            <button onClick={() => setDel(r)} className="text-rose-600 hover:underline">Delete</button>
          </div>
        )}
      />

      {modal && (
        <FormModal open wide title={modal.mode === 'create' ? 'Add doctor' : 'Edit doctor'} onClose={() => setModal(null)} onSubmit={save} submitting={busy}>
          <Field label="Name" required><input className={inputClass} value={modal.form.name} onChange={e => setF('name', e.target.value)} placeholder="Dr. …" /></Field>
          <ImageUploader label="Photo" value={modal.form.imageUrl} onChange={v => setF('imageUrl', v)} />
          <Field label="Specialty">
            <select className={inputClass} value={modal.form.specialtyId} onChange={e => setF('specialtyId', e.target.value)}>
              <option value="">Uncategorised</option>
              {specs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Qualifications"><input className={inputClass} value={modal.form.qualifications} onChange={e => setF('qualifications', e.target.value)} placeholder="MBBS, MD" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Experience (years)"><input type="number" min="0" className={inputClass} value={modal.form.experienceYears} onChange={e => setF('experienceYears', Number(e.target.value))} /></Field>
            <Field label="Consultation fee (₹)"><input type="number" min="0" className={inputClass} value={modal.form.fee} onChange={e => setF('fee', Number(e.target.value))} /></Field>
            <Field label="Rating (0–5)"><input type="number" step="0.1" min="0" max="5" className={inputClass} value={modal.form.rating} onChange={e => setF('rating', Number(e.target.value))} /></Field>
            <Field label="Phone"><input className={inputClass} value={modal.form.phone} onChange={e => setF('phone', e.target.value)} /></Field>
          </div>
          <Field label="Languages"><input className={inputClass} value={modal.form.languages} onChange={e => setF('languages', e.target.value)} placeholder="Hindi, English" /></Field>
          <Field label="Available days" hint="Comma-separated"><input className={inputClass} value={modal.form.availableDays} onChange={e => setF('availableDays', e.target.value)} placeholder="Mon, Tue, Wed, Fri" /></Field>
          <Field label="Time slots" hint="Comma-separated"><input className={inputClass} value={modal.form.slots} onChange={e => setF('slots', e.target.value)} placeholder="10:00 AM, 11:00 AM, 5:00 PM" /></Field>
          <Field label="Description"><textarea rows={2} className={inputClass} value={modal.form.description} onChange={e => setF('description', e.target.value)} /></Field>
          <Field label="Sort order"><input type="number" className={inputClass} value={modal.form.sortOrder} onChange={e => setF('sortOrder', Number(e.target.value))} /></Field>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={modal.form.isActive} onChange={e => setF('isActive', e.target.checked)} /> Active (bookable in app)</label>
        </FormModal>
      )}

      <ConfirmDialog open={!!del} title="Delete doctor?" message={del ? `“${del.name}” will be removed.` : ''} confirmLabel="Delete" danger busy={busy} onCancel={() => setDel(null)} onConfirm={remove} />
    </div>
  );
}
