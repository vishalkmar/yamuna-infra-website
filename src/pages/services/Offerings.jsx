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

const blank = { name: '', description: '', price: 0, unit: '', imageUrl: '', isActive: true, sortOrder: 0 };

export default function Offerings() {
  const { providerId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [provider, setProvider] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/services/providers/${providerId}/offerings`);
      setProvider(data.data.provider);
      setRows(data.data.offerings);
    } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [providerId, toast]);

  useEffect(() => { load(); }, [load]);

  const setF = (k, v) => setModal(m => ({ ...m, form: { ...m.form, [k]: v } }));

  async function save() {
    const { mode, form, id } = modal;
    setBusy(true);
    try {
      if (mode === 'create') await api.post(`/admin/services/providers/${providerId}/offerings`, form);
      else await api.put(`/admin/services/offerings/${id}`, form);
      toast.success(`Offering ${mode === 'create' ? 'created' : 'updated'}`);
      setModal(null); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.delete(`/admin/services/offerings/${del.id}`);
      toast.success('Offering deleted'); setDel(null); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const columns = [
    { key: 'name', header: 'Offering', render: r => (
      <div className="flex items-center gap-2">
        {r.imageUrl && <img src={r.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover" />}
        <div>
          <div className="font-medium text-slate-800">{r.name}</div>
          <div className="text-xs text-slate-400">{r.description}</div>
        </div>
      </div>
    ) },
    { key: 'price', header: 'Price', render: r => fmtMoney(r.price) },
    { key: 'unit', header: 'Unit' },
    { key: 'isActive', header: 'Status', render: r => <StatusBadge status={r.isActive ? 'active' : 'inactive'}>{r.isActive ? 'Active' : 'Hidden'}</StatusBadge> },
    { key: 'sortOrder', header: 'Order' },
  ];

  return (
    <div>
      <button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:text-slate-700 mb-3">← Back to providers</button>
      <PageHeader
        title={`${provider?.name || 'Provider'} — Offerings`}
        subtitle={provider ? `${provider.categoryName} · ${rows.length} offering${rows.length === 1 ? '' : 's'}` : ''}
        actionLabel="+ Add offering"
        onAction={() => setModal({ mode: 'create', form: { ...blank } })}
      />

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        empty="No offerings yet — add the services this provider offers"
        actions={r => (
          <div className="flex justify-end gap-3">
            <button onClick={() => setModal({ mode: 'edit', id: r.id, form: { name: r.name, description: r.description || '', price: Number(r.price), unit: r.unit || '', imageUrl: r.imageUrl || '', isActive: !!r.isActive, sortOrder: r.sortOrder } })} className="text-slate-600 hover:underline">Edit</button>
            <button onClick={() => setDel(r)} className="text-rose-600 hover:underline">Delete</button>
          </div>
        )}
      />

      {modal && (
        <FormModal open title={modal.mode === 'create' ? 'Add offering' : 'Edit offering'} onClose={() => setModal(null)} onSubmit={save} submitting={busy}>
          <Field label="Name" required><input className={inputClass} value={modal.form.name} onChange={e => setF('name', e.target.value)} placeholder="e.g. Deep cleaning" /></Field>
          <Field label="Description"><textarea rows={2} className={inputClass} value={modal.form.description} onChange={e => setF('description', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price (₹)" required><input type="number" min="0" className={inputClass} value={modal.form.price} onChange={e => setF('price', Number(e.target.value))} /></Field>
            <Field label="Unit"><input className={inputClass} value={modal.form.unit} onChange={e => setF('unit', e.target.value)} placeholder="per visit / per month" /></Field>
          </div>
          <ImageUploader label="Image" value={modal.form.imageUrl} onChange={v => setF('imageUrl', v)} />
          <Field label="Sort order"><input type="number" className={inputClass} value={modal.form.sortOrder} onChange={e => setF('sortOrder', Number(e.target.value))} /></Field>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={modal.form.isActive} onChange={e => setF('isActive', e.target.checked)} /> Active (bookable in app)</label>
        </FormModal>
      )}

      <ConfirmDialog open={!!del} title="Delete offering?" message={del ? `“${del.name}” will be removed.` : ''} confirmLabel="Delete" danger busy={busy} onCancel={() => setDel(null)} onConfirm={remove} />
    </div>
  );
}
