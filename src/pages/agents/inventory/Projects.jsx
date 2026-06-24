import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../../lib/api';
import { useToast } from '../../../components/Toast';
import PageHeader from '../../../components/PageHeader';
import SearchBar from '../../../components/SearchBar';
import DataTable from '../../../components/DataTable';
import StatusBadge from '../../../components/StatusBadge';
import ConfirmDialog from '../../../components/ConfirmDialog';
import FormModal, { Field, inputClass } from '../../../components/FormModal';
import ImageUploader from '../../../components/ImageUploader';
import { fmtMoney } from '../../../lib/format';

const empty = {
  name: '', location: '', city: '', state: '', status: 'ongoing', reraNo: '',
  description: '', imageUrl: '', priceFrom: 0, priceTo: 0, isActive: true, sortOrder: 0,
};
const STATUSES = ['upcoming', 'ongoing', 'ready', 'sold_out'];

export default function Projects() {
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [delTarget, setDelTarget] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/inventory', { params: search ? { search } : {} });
      setRows(data.data);
    } catch (e) { toast.error(apiError(e, 'Could not load projects')); } finally { setLoading(false); }
  }, [search, toast]);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setEdit(null); setForm(empty); setFormOpen(true); }
  function openEdit(r) { setEdit(r); setForm({ ...empty, ...r }); setFormOpen(true); }

  async function submit() {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setBusy(true);
    try {
      const payload = {
        name: form.name, location: form.location || null, city: form.city || null,
        state: form.state || null, status: form.status, reraNo: form.reraNo || null,
        description: form.description || null, imageUrl: form.imageUrl || null,
        priceFrom: Number(form.priceFrom) || 0, priceTo: Number(form.priceTo) || 0,
        isActive: !!form.isActive, sortOrder: Number(form.sortOrder) || 0,
      };
      if (edit) await api.put(`/admin/inventory/${edit.id}`, payload);
      else await api.post('/admin/inventory', payload);
      toast.success(edit ? 'Project updated' : 'Project created');
      setFormOpen(false);
      load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      await api.delete(`/admin/inventory/${delTarget.id}`);
      toast.success('Project deleted');
      setDelTarget(null);
      load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const columns = [
    {
      key: 'name', header: 'Project',
      render: r => (
        <div className="flex items-center gap-2">
          {r.imageUrl ? <img src={r.imageUrl} alt="" className="w-9 h-9 rounded object-cover border border-slate-200" /> : <div className="w-9 h-9 rounded bg-slate-100 grid place-items-center">🏢</div>}
          <div>
            <div className="font-medium text-slate-800">{r.name}</div>
            <div className="text-xs text-slate-400">{[r.location, r.city].filter(Boolean).join(', ')}</div>
          </div>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status}>{r.status}</StatusBadge> },
    { key: 'price', header: 'Price', render: r => `${fmtMoney(r.priceFrom)}${r.priceTo ? ' – ' + fmtMoney(r.priceTo) : ''}` },
    { key: 'towerCount', header: 'Towers', render: r => r.towerCount || 0 },
    { key: 'unitCount', header: 'Units', render: r => `${r.availableCount || 0}/${r.unitCount || 0} avail.` },
    { key: 'isActive', header: 'Active', render: r => <StatusBadge status={r.isActive ? 'active' : 'inactive'}>{r.isActive ? 'Yes' : 'No'}</StatusBadge> },
  ];

  return (
    <div>
      <PageHeader title="Inventory — Projects" subtitle={`${rows.length} project${rows.length === 1 ? '' : 's'}`}>
        <button onClick={openCreate} className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90">+ Add project</button>
      </PageHeader>

      <div className="mb-4"><SearchBar value={search} onChange={setSearch} placeholder="Search name, location, city…" /></div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        empty="No projects yet. Add your first development."
        actions={r => (
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/agents/inventory/${r.id}`)} className="text-brand-primary font-semibold hover:underline">Manage units</button>
            <button onClick={() => openEdit(r)} className="text-slate-600 font-semibold hover:underline">Edit</button>
            <button onClick={() => setDelTarget(r)} className="text-rose-600 font-semibold hover:underline">Delete</button>
          </div>
        )}
      />

      <FormModal open={formOpen} title={edit ? 'Edit project' : 'Add project'} onClose={() => setFormOpen(false)} onSubmit={submit} submitting={busy} submitLabel={edit ? 'Save' : 'Create'} wide>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" required><input className={inputClass} value={form.name} onChange={e => set('name', e.target.value)} /></Field>
          <Field label="RERA no."><input className={inputClass} value={form.reraNo || ''} onChange={e => set('reraNo', e.target.value)} /></Field>
          <Field label="Location"><input className={inputClass} value={form.location || ''} onChange={e => set('location', e.target.value)} /></Field>
          <Field label="City"><input className={inputClass} value={form.city || ''} onChange={e => set('city', e.target.value)} /></Field>
          <Field label="State"><input className={inputClass} value={form.state || ''} onChange={e => set('state', e.target.value)} /></Field>
          <Field label="Status"><select className={inputClass} value={form.status} onChange={e => set('status', e.target.value)}>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></Field>
          <Field label="Price from (₹)"><input type="number" className={inputClass} value={form.priceFrom} onChange={e => set('priceFrom', e.target.value)} /></Field>
          <Field label="Price to (₹)"><input type="number" className={inputClass} value={form.priceTo} onChange={e => set('priceTo', e.target.value)} /></Field>
          <Field label="Sort order"><input type="number" className={inputClass} value={form.sortOrder} onChange={e => set('sortOrder', e.target.value)} /></Field>
        </div>
        <Field label="Description"><textarea className={inputClass} rows={3} value={form.description || ''} onChange={e => set('description', e.target.value)} /></Field>
        <Field label="Cover image"><ImageUploader value={form.imageUrl} onChange={url => set('imageUrl', url)} label="Project image" /></Field>
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={!!form.isActive} onChange={e => set('isActive', e.target.checked)} /> Active (visible to agents)</label>
      </FormModal>

      <ConfirmDialog
        open={!!delTarget}
        title="Delete project?"
        message={`This permanently removes "${delTarget?.name}" with all its towers and units. This cannot be undone.`}
        confirmLabel="Delete"
        danger
        busy={busy}
        onCancel={() => setDelTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
