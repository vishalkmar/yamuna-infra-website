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

const blank = { code: '', label: '', icon: '', imageUrl: '', capacity: 4, baseFare: 0, perKm: 0, etaMinutes: 5, isActive: true, sortOrder: 0 };

export default function Vehicles() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/admin/transport/vehicles'); setRows(data.data); }
    catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  const setF = (k, v) => setModal(m => ({ ...m, form: { ...m.form, [k]: v } }));

  async function save() {
    const { mode, form, id } = modal;
    setBusy(true);
    try {
      if (mode === 'create') await api.post('/admin/transport/vehicles', form);
      else await api.put(`/admin/transport/vehicles/${id}`, form);
      toast.success(`Vehicle ${mode === 'create' ? 'created' : 'updated'}`);
      setModal(null); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    try { await api.delete(`/admin/transport/vehicles/${del.id}`); toast.success('Vehicle deleted'); setDel(null); load(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const columns = [
    { key: 'label', header: 'Vehicle', render: r => <span className="font-medium text-slate-800"><span className="text-lg mr-1">{r.icon}</span>{r.label} <code className="text-xs text-slate-400">{r.code}</code></span> },
    { key: 'capacity', header: 'Seats' },
    { key: 'baseFare', header: 'Base', render: r => fmtMoney(r.baseFare) },
    { key: 'perKm', header: 'Per km', render: r => fmtMoney(r.perKm) },
    { key: 'etaMinutes', header: 'ETA', render: r => `${r.etaMinutes} min` },
    { key: 'isActive', header: 'Status', render: r => <StatusBadge status={r.isActive ? 'active' : 'inactive'}>{r.isActive ? 'Active' : 'Hidden'}</StatusBadge> },
  ];

  return (
    <div>
      <PageHeader title="Transport — Vehicle Types" subtitle="Ola/Uber-style fares" actionLabel="+ Add vehicle" onAction={() => setModal({ mode: 'create', form: { ...blank } })}>
        <Link to="/transport/places" className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">Places</Link>
        <Link to="/transport/fares" className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">Fare rules</Link>
        <Link to="/transport/rides" className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">Rides</Link>
      </PageHeader>

      <DataTable columns={columns} rows={rows} loading={loading} empty="No vehicle types yet"
        actions={r => (
          <div className="flex justify-end gap-3">
            <button onClick={() => setModal({ mode: 'edit', id: r.id, form: { label: r.label, icon: r.icon || '', imageUrl: r.imageUrl || '', capacity: r.capacity, baseFare: Number(r.baseFare), perKm: Number(r.perKm), etaMinutes: r.etaMinutes, isActive: !!r.isActive, sortOrder: r.sortOrder } })} className="text-slate-600 hover:underline">Edit</button>
            <button onClick={() => setDel(r)} className="text-rose-600 hover:underline">Delete</button>
          </div>
        )}
      />

      {modal && (
        <FormModal open title={modal.mode === 'create' ? 'Add vehicle type' : 'Edit vehicle type'} onClose={() => setModal(null)} onSubmit={save} submitting={busy}>
          {modal.mode === 'create' && (
            <Field label="Code" hint="Lowercase key (e.g. sedan). Cannot change later." required>
              <input className={inputClass} value={modal.form.code} onChange={e => setF('code', e.target.value.toLowerCase().replace(/\s+/g, '_'))} />
            </Field>
          )}
          <Field label="Label" required><input className={inputClass} value={modal.form.label} onChange={e => setF('label', e.target.value)} /></Field>
          <Field label="Icon (emoji)"><input className={inputClass} value={modal.form.icon} onChange={e => setF('icon', e.target.value)} placeholder="🚙" /></Field>
          <ImageUploader label="Image (optional)" value={modal.form.imageUrl} onChange={v => setF('imageUrl', v)} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Capacity (seats)"><input type="number" min="1" className={inputClass} value={modal.form.capacity} onChange={e => setF('capacity', Number(e.target.value))} /></Field>
            <Field label="ETA (minutes)"><input type="number" min="0" className={inputClass} value={modal.form.etaMinutes} onChange={e => setF('etaMinutes', Number(e.target.value))} /></Field>
            <Field label="Base fare (₹)"><input type="number" min="0" className={inputClass} value={modal.form.baseFare} onChange={e => setF('baseFare', Number(e.target.value))} /></Field>
            <Field label="Per km (₹)"><input type="number" min="0" step="0.5" className={inputClass} value={modal.form.perKm} onChange={e => setF('perKm', Number(e.target.value))} /></Field>
            <Field label="Sort order"><input type="number" className={inputClass} value={modal.form.sortOrder} onChange={e => setF('sortOrder', Number(e.target.value))} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={modal.form.isActive} onChange={e => setF('isActive', e.target.checked)} /> Active (bookable in app)</label>
        </FormModal>
      )}

      <ConfirmDialog open={!!del} title="Delete vehicle type?" message={del ? `“${del.label}” will be removed.` : ''} confirmLabel="Delete" danger busy={busy} onCancel={() => setDel(null)} onConfirm={remove} />
    </div>
  );
}
