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

const PERIODS = ['daily', 'weekly', 'monthly'];
const DIETS = ['satvik', 'jain', 'regular_veg', 'custom'];
const blank = { code: '', name: '', description: '', imageUrl: '', period: 'monthly', price: 0, mealsPerDay: 2, mealsIncluded: 'lunch,dinner', dietType: 'satvik', isActive: true, sortOrder: 0 };

export default function TiffinPlans() {
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/admin/food/tiffin-plans'); setRows(data.data); }
    catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  const setF = (k, v) => setModal(m => ({ ...m, form: { ...m.form, [k]: v } }));

  async function save() {
    const { mode, form, id } = modal;
    setBusy(true);
    try {
      if (mode === 'create') await api.post('/admin/food/tiffin-plans', form);
      else await api.put(`/admin/food/tiffin-plans/${id}`, form);
      toast.success(`Plan ${mode === 'create' ? 'created' : 'updated'}`);
      setModal(null); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    try { await api.delete(`/admin/food/tiffin-plans/${del.id}`); toast.success('Plan deleted'); setDel(null); load(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const columns = [
    { key: 'name', header: 'Plan', render: r => (
      <div className="flex items-center gap-2">
        {r.imageUrl ? <img src={r.imageUrl} alt="" className="w-12 h-9 rounded object-cover" /> : <div className="w-12 h-9 rounded bg-slate-100 grid place-items-center">🍱</div>}
        <div>
          <div className="font-medium text-slate-800">{r.name} <code className="text-xs text-slate-400">{r.code}</code></div>
          <div className="text-xs text-slate-400">{r.description}</div>
        </div>
      </div>
    ) },
    { key: 'period', header: 'Period', render: r => <span className="capitalize">{r.period}</span> },
    { key: 'price', header: 'Price', render: r => fmtMoney(r.price) },
    { key: 'dietType', header: 'Diet', render: r => <span className="capitalize">{String(r.dietType).replace('_', ' ')}</span> },
    { key: 'mealsIncluded', header: 'Meals', render: r => r.mealsIncluded || `${r.mealsPerDay}/day` },
    { key: 'isActive', header: 'Status', render: r => <StatusBadge status={r.isActive ? 'active' : 'inactive'}>{r.isActive ? 'Active' : 'Hidden'}</StatusBadge> },
  ];

  return (
    <div>
      <button onClick={() => navigate('/food')} className="text-sm text-slate-500 hover:text-slate-700 mb-3">← Back to food</button>
      <PageHeader title="Tiffin Plans" subtitle={`${rows.length} plan${rows.length === 1 ? '' : 's'}`} actionLabel="+ Add plan" onAction={() => setModal({ mode: 'create', form: { ...blank } })}>
        <Link to="/food/tiffin/subscriptions" className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">Subscriptions</Link>
      </PageHeader>

      <DataTable columns={columns} rows={rows} loading={loading} empty="No tiffin plans yet"
        actions={r => (
          <div className="flex justify-end gap-3">
            <button onClick={() => setModal({ mode: 'edit', id: r.id, form: { name: r.name, description: r.description || '', imageUrl: r.imageUrl || '', period: r.period, price: Number(r.price), mealsPerDay: r.mealsPerDay, mealsIncluded: r.mealsIncluded || '', dietType: r.dietType, isActive: !!r.isActive, sortOrder: r.sortOrder } })} className="text-slate-600 hover:underline">Edit</button>
            <button onClick={() => setDel(r)} className="text-rose-600 hover:underline">Delete</button>
          </div>
        )}
      />

      {modal && (
        <FormModal open title={modal.mode === 'create' ? 'Add tiffin plan' : 'Edit tiffin plan'} onClose={() => setModal(null)} onSubmit={save} submitting={busy}>
          {modal.mode === 'create' && (
            <Field label="Code" hint="Lowercase key (e.g. satvik_monthly). Cannot change later." required>
              <input className={inputClass} value={modal.form.code} onChange={e => setF('code', e.target.value.toLowerCase().replace(/\s+/g, '_'))} />
            </Field>
          )}
          <Field label="Name" required><input className={inputClass} value={modal.form.name} onChange={e => setF('name', e.target.value)} /></Field>
          <Field label="Description"><textarea rows={2} className={inputClass} value={modal.form.description} onChange={e => setF('description', e.target.value)} /></Field>
          <ImageUploader label="Image" value={modal.form.imageUrl} onChange={v => setF('imageUrl', v)} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Period">
              <select className={inputClass} value={modal.form.period} onChange={e => setF('period', e.target.value)}>{PERIODS.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}</select>
            </Field>
            <Field label="Price (₹)" required><input type="number" min="0" className={inputClass} value={modal.form.price} onChange={e => setF('price', Number(e.target.value))} /></Field>
            <Field label="Diet type">
              <select className={inputClass} value={modal.form.dietType} onChange={e => setF('dietType', e.target.value)}>{DIETS.map(d => <option key={d} value={d}>{d.replace('_', ' ')}</option>)}</select>
            </Field>
            <Field label="Meals per day"><input type="number" min="1" max="5" className={inputClass} value={modal.form.mealsPerDay} onChange={e => setF('mealsPerDay', Number(e.target.value))} /></Field>
          </div>
          <Field label="Meals included" hint="Comma-separated (e.g. lunch,dinner)"><input className={inputClass} value={modal.form.mealsIncluded} onChange={e => setF('mealsIncluded', e.target.value)} /></Field>
          <Field label="Sort order"><input type="number" className={inputClass} value={modal.form.sortOrder} onChange={e => setF('sortOrder', Number(e.target.value))} /></Field>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={modal.form.isActive} onChange={e => setF('isActive', e.target.checked)} /> Active (visible in app)</label>
        </FormModal>
      )}

      <ConfirmDialog open={!!del} title="Delete plan?" message={del ? `“${del.name}” will be removed.` : ''} confirmLabel="Delete" danger busy={busy} onCancel={() => setDel(null)} onConfirm={remove} />
    </div>
  );
}
