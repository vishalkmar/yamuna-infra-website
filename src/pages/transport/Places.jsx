import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormModal, { Field, inputClass } from '../../components/FormModal';

const blank = { name: '', area: '', lat: '', lng: '', isTemple: false, isActive: true, sortOrder: 0 };

export default function Places() {
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/admin/transport/places'); setRows(data.data); }
    catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  const setF = (k, v) => setModal(m => ({ ...m, form: { ...m.form, [k]: v } }));

  async function save() {
    const { mode, form, id } = modal;
    const payload = { ...form, lat: Number(form.lat), lng: Number(form.lng) };
    setBusy(true);
    try {
      if (mode === 'create') await api.post('/admin/transport/places', payload);
      else await api.put(`/admin/transport/places/${id}`, payload);
      toast.success(`Place ${mode === 'create' ? 'created' : 'updated'}`);
      setModal(null); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    try { await api.delete(`/admin/transport/places/${del.id}`); toast.success('Place deleted'); setDel(null); load(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const columns = [
    { key: 'name', header: 'Place', render: r => <span className="font-medium text-slate-800">{r.isTemple ? '🛕 ' : '📍 '}{r.name}</span> },
    { key: 'area', header: 'Area' },
    { key: 'lat', header: 'Lat' },
    { key: 'lng', header: 'Lng' },
    { key: 'isActive', header: 'Status', render: r => <StatusBadge status={r.isActive ? 'active' : 'inactive'}>{r.isActive ? 'Active' : 'Hidden'}</StatusBadge> },
  ];

  return (
    <div>
      <button onClick={() => navigate('/transport')} className="text-sm text-slate-500 hover:text-slate-700 mb-3">← Back to transport</button>
      <PageHeader title="Transport — Places" subtitle="Vrindavan / Mathura pickup & drop points (with coordinates)" actionLabel="+ Add place" onAction={() => setModal({ mode: 'create', form: { ...blank } })} />

      <DataTable columns={columns} rows={rows} loading={loading} empty="No places yet"
        actions={r => (
          <div className="flex justify-end gap-3">
            <button onClick={() => setModal({ mode: 'edit', id: r.id, form: { name: r.name, area: r.area || '', lat: r.lat, lng: r.lng, isTemple: !!r.isTemple, isActive: !!r.isActive, sortOrder: r.sortOrder } })} className="text-slate-600 hover:underline">Edit</button>
            <button onClick={() => setDel(r)} className="text-rose-600 hover:underline">Delete</button>
          </div>
        )}
      />

      {modal && (
        <FormModal open title={modal.mode === 'create' ? 'Add place' : 'Edit place'} onClose={() => setModal(null)} onSubmit={save} submitting={busy}>
          <Field label="Name" required><input className={inputClass} value={modal.form.name} onChange={e => setF('name', e.target.value)} /></Field>
          <Field label="Area"><input className={inputClass} value={modal.form.area} onChange={e => setF('area', e.target.value)} placeholder="Vrindavan / Mathura" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude" required><input type="number" step="0.0000001" className={inputClass} value={modal.form.lat} onChange={e => setF('lat', e.target.value)} placeholder="27.5650" /></Field>
            <Field label="Longitude" required><input type="number" step="0.0000001" className={inputClass} value={modal.form.lng} onChange={e => setF('lng', e.target.value)} placeholder="77.6590" /></Field>
            <Field label="Sort order"><input type="number" className={inputClass} value={modal.form.sortOrder} onChange={e => setF('sortOrder', Number(e.target.value))} /></Field>
          </div>
          <div className="flex gap-5">
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={modal.form.isTemple} onChange={e => setF('isTemple', e.target.checked)} /> Temple</label>
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={modal.form.isActive} onChange={e => setF('isActive', e.target.checked)} /> Active</label>
          </div>
          <p className="text-xs text-slate-400">Tip: copy coordinates from Google Maps (right-click → the lat,lng at top).</p>
        </FormModal>
      )}

      <ConfirmDialog open={!!del} title="Delete place?" message={del ? `“${del.name}” will be removed.` : ''} confirmLabel="Delete" danger busy={busy} onCancel={() => setDel(null)} onConfirm={remove} />
    </div>
  );
}
