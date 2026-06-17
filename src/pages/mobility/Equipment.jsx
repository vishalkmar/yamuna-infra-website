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

const blank = { code: '', name: '', imageUrl: '', categoryId: '', description: '', rentPerDay: 0, buyPrice: 0, deposit: 0, attendantAvailable: false, isActive: true, sortOrder: 0 };

export default function Equipment() {
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
      const [eRes, cRes] = await Promise.all([
        api.get('/admin/mobility/equipment', { params }),
        api.get('/admin/mobility/categories'),
      ]);
      setRows(eRes.data.data); setCats(cRes.data.data);
    } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [filter, toast]);

  useEffect(() => { load(); }, [load]);
  const setF = (k, v) => setModal(m => ({ ...m, form: { ...m.form, [k]: v } }));

  async function save() {
    const { mode, form, id } = modal;
    const payload = { ...form, categoryId: Number(form.categoryId) };
    setBusy(true);
    try {
      if (mode === 'create') await api.post('/admin/mobility/equipment', payload);
      else await api.put(`/admin/mobility/equipment/${id}`, payload);
      toast.success(`Equipment ${mode === 'create' ? 'created' : 'updated'}`);
      setModal(null); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    try { await api.delete(`/admin/mobility/equipment/${del.id}`); toast.success('Equipment deleted'); setDel(null); load(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const columns = [
    { key: 'name', header: 'Equipment', render: r => (
      <div className="flex items-center gap-2">
        {r.imageUrl ? <img src={r.imageUrl} alt="" className="w-12 h-9 rounded object-cover" /> : <div className="w-12 h-9 rounded bg-slate-100 grid place-items-center">🦽</div>}
        <div>
          <div className="font-medium text-slate-800">{r.name}</div>
          <div className="text-xs text-slate-400">{r.categoryName || 'Uncategorised'} · {r.description}</div>
        </div>
      </div>
    ) },
    { key: 'rentPerDay', header: 'Rent/day', render: r => fmtMoney(r.rentPerDay) },
    { key: 'buyPrice', header: 'Buy', render: r => fmtMoney(r.buyPrice) },
    { key: 'deposit', header: 'Deposit', render: r => fmtMoney(r.deposit) },
    { key: 'attendantAvailable', header: 'Attendant', render: r => (r.attendantAvailable ? '✅' : '—') },
    { key: 'isActive', header: 'Status', render: r => <StatusBadge status={r.isActive ? 'active' : 'inactive'}>{r.isActive ? 'Active' : 'Hidden'}</StatusBadge> },
  ];

  return (
    <div>
      <PageHeader title="Mobility Aids" subtitle={`${rows.length} item${rows.length === 1 ? '' : 's'}`} actionLabel="+ Add equipment" onAction={() => setModal({ mode: 'create', form: { ...blank } })}>
        <Link to="/mobility/categories" className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">Categories</Link>
        <Link to="/mobility/requests" className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">Requests</Link>
      </PageHeader>

      <div className="mb-4">
        <select value={filter} onChange={e => setFilter(e.target.value)} className="text-sm border border-slate-300 rounded-lg px-3 py-2">
          <option value="">All categories</option>
          {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <DataTable columns={columns} rows={rows} loading={loading} empty="No equipment yet"
        actions={r => (
          <div className="flex justify-end gap-3">
            <button onClick={() => setModal({ mode: 'edit', id: r.id, form: { name: r.name, imageUrl: r.imageUrl || '', categoryId: r.categoryId || '', description: r.description || '', rentPerDay: Number(r.rentPerDay), buyPrice: Number(r.buyPrice), deposit: Number(r.deposit), attendantAvailable: !!r.attendantAvailable, isActive: !!r.isActive, sortOrder: r.sortOrder } })} className="text-slate-600 hover:underline">Edit</button>
            <button onClick={() => setDel(r)} className="text-rose-600 hover:underline">Delete</button>
          </div>
        )}
      />

      {modal && (
        <FormModal open title={modal.mode === 'create' ? 'Add equipment' : 'Edit equipment'} onClose={() => setModal(null)} onSubmit={save} submitting={busy}>
          {modal.mode === 'create' && (
            <Field label="Code" hint="Short key (e.g. WC-M). Cannot change later." required>
              <input className={inputClass} value={modal.form.code} onChange={e => setF('code', e.target.value.toUpperCase())} />
            </Field>
          )}
          <Field label="Name" required><input className={inputClass} value={modal.form.name} onChange={e => setF('name', e.target.value)} /></Field>
          <Field label="Category" required>
            <select className={inputClass} value={modal.form.categoryId} onChange={e => setF('categoryId', e.target.value)}>
              <option value="">Select category…</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <ImageUploader label="Photo" value={modal.form.imageUrl} onChange={v => setF('imageUrl', v)} />
          <Field label="Description"><input className={inputClass} value={modal.form.description} onChange={e => setF('description', e.target.value)} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Rent/day (₹)"><input type="number" min="0" className={inputClass} value={modal.form.rentPerDay} onChange={e => setF('rentPerDay', Number(e.target.value))} /></Field>
            <Field label="Buy price (₹)"><input type="number" min="0" className={inputClass} value={modal.form.buyPrice} onChange={e => setF('buyPrice', Number(e.target.value))} /></Field>
            <Field label="Deposit (₹)"><input type="number" min="0" className={inputClass} value={modal.form.deposit} onChange={e => setF('deposit', Number(e.target.value))} /></Field>
          </div>
          <Field label="Sort order"><input type="number" className={inputClass} value={modal.form.sortOrder} onChange={e => setF('sortOrder', Number(e.target.value))} /></Field>
          <div className="flex gap-5">
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={modal.form.attendantAvailable} onChange={e => setF('attendantAvailable', e.target.checked)} /> Attendant available</label>
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={modal.form.isActive} onChange={e => setF('isActive', e.target.checked)} /> Active</label>
          </div>
        </FormModal>
      )}

      <ConfirmDialog open={!!del} title="Delete equipment?" message={del ? `“${del.name}” will be removed.` : ''} confirmLabel="Delete" danger busy={busy} onCancel={() => setDel(null)} onConfirm={remove} />
    </div>
  );
}
