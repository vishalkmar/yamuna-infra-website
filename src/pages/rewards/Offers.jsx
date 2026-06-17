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

const blank = { title: '', partner: '', description: '', imageUrl: '', pointsCost: 0, category: '', isActive: true, sortOrder: 0 };

export default function Offers() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/admin/rewards/offers'); setRows(data.data); }
    catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  const setF = (k, v) => setModal(m => ({ ...m, form: { ...m.form, [k]: v } }));

  async function save() {
    const { mode, form, id } = modal;
    setBusy(true);
    try {
      if (mode === 'create') await api.post('/admin/rewards/offers', form);
      else await api.put(`/admin/rewards/offers/${id}`, form);
      toast.success(`Offer ${mode === 'create' ? 'created' : 'updated'}`);
      setModal(null); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    try { await api.delete(`/admin/rewards/offers/${del.id}`); toast.success('Offer deleted'); setDel(null); load(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const columns = [
    { key: 'title', header: 'Offer', render: r => (
      <div className="flex items-center gap-2">
        {r.imageUrl ? <img src={r.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 rounded-lg bg-slate-100 grid place-items-center">🎁</div>}
        <div>
          <div className="font-medium text-slate-800">{r.title}</div>
          <div className="text-xs text-slate-400">{r.partner} · {r.description}</div>
        </div>
      </div>
    ) },
    { key: 'pointsCost', header: 'Points', render: r => <span className="font-semibold">{r.pointsCost} pts</span> },
    { key: 'category', header: 'Category', render: r => <span className="capitalize">{r.category || '—'}</span> },
    { key: 'isActive', header: 'Status', render: r => <StatusBadge status={r.isActive ? 'active' : 'inactive'}>{r.isActive ? 'Active' : 'Hidden'}</StatusBadge> },
  ];

  return (
    <div>
      <PageHeader title="Rewards & Projects" subtitle="Reward offers" actionLabel="+ Add offer" onAction={() => setModal({ mode: 'create', form: { ...blank } })}>
        <Link to="/rewards/redemptions" className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">Redemptions</Link>
        <Link to="/rewards/projects" className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">Projects</Link>
        <Link to="/rewards/referrals" className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">Referrals</Link>
      </PageHeader>

      <DataTable columns={columns} rows={rows} loading={loading} empty="No offers yet"
        actions={r => (
          <div className="flex justify-end gap-3">
            <button onClick={() => setModal({ mode: 'edit', id: r.id, form: { title: r.title, partner: r.partner || '', description: r.description || '', imageUrl: r.imageUrl || '', pointsCost: r.pointsCost, category: r.category || '', isActive: !!r.isActive, sortOrder: r.sortOrder } })} className="text-slate-600 hover:underline">Edit</button>
            <button onClick={() => setDel(r)} className="text-rose-600 hover:underline">Delete</button>
          </div>
        )}
      />

      {modal && (
        <FormModal open title={modal.mode === 'create' ? 'Add offer' : 'Edit offer'} onClose={() => setModal(null)} onSubmit={save} submitting={busy}>
          <Field label="Title" required><input className={inputClass} value={modal.form.title} onChange={e => setF('title', e.target.value)} /></Field>
          <Field label="Partner"><input className={inputClass} value={modal.form.partner} onChange={e => setF('partner', e.target.value)} /></Field>
          <ImageUploader label="Image" value={modal.form.imageUrl} onChange={v => setF('imageUrl', v)} />
          <Field label="Description"><textarea rows={2} className={inputClass} value={modal.form.description} onChange={e => setF('description', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Points cost" required><input type="number" min="0" className={inputClass} value={modal.form.pointsCost} onChange={e => setF('pointsCost', Number(e.target.value))} /></Field>
            <Field label="Category"><input className={inputClass} value={modal.form.category} onChange={e => setF('category', e.target.value)} placeholder="dining / wellness" /></Field>
          </div>
          <Field label="Sort order"><input type="number" className={inputClass} value={modal.form.sortOrder} onChange={e => setF('sortOrder', Number(e.target.value))} /></Field>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={modal.form.isActive} onChange={e => setF('isActive', e.target.checked)} /> Active</label>
        </FormModal>
      )}

      <ConfirmDialog open={!!del} title="Delete offer?" message={del ? `“${del.title}” will be removed.` : ''} confirmLabel="Delete" danger busy={busy} onCancel={() => setDel(null)} onConfirm={remove} />
    </div>
  );
}
