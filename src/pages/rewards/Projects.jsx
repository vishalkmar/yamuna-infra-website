import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormModal, { Field, inputClass } from '../../components/FormModal';
import ImageUploader from '../../components/ImageUploader';
import { fmtMoney } from '../../lib/format';

const PROJECT_STATUSES = ['pre_launch', 'launching', 'open'];
const blank = { code: '', name: '', location: '', priceFrom: 0, status: 'pre_launch', description: '', imageUrl: '', isActive: true, sortOrder: 0 };

export default function Projects() {
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/admin/rewards/projects'); setRows(data.data); }
    catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  const setF = (k, v) => setModal(m => ({ ...m, form: { ...m.form, [k]: v } }));

  async function save() {
    const { mode, form, id } = modal;
    setBusy(true);
    try {
      if (mode === 'create') await api.post('/admin/rewards/projects', form);
      else await api.put(`/admin/rewards/projects/${id}`, form);
      toast.success(`Project ${mode === 'create' ? 'created' : 'updated'}`);
      setModal(null); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    try { await api.delete(`/admin/rewards/projects/${del.id}`); toast.success('Project deleted'); setDel(null); load(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const columns = [
    { key: 'name', header: 'Project', render: r => (
      <div className="flex items-center gap-2">
        {r.imageUrl ? <img src={r.imageUrl} alt="" className="w-12 h-9 rounded object-cover" /> : <div className="w-12 h-9 rounded bg-slate-100 grid place-items-center">🏗️</div>}
        <div>
          <div className="font-medium text-slate-800">{r.name} <code className="text-xs text-slate-400">{r.code}</code></div>
          <div className="text-xs text-slate-400">{r.location}</div>
        </div>
      </div>
    ) },
    { key: 'priceFrom', header: 'From', render: r => fmtMoney(r.priceFrom) },
    { key: 'status', header: 'Stage', render: r => <span className="capitalize">{String(r.status).replace('_', ' ')}</span> },
    { key: 'isActive', header: 'Status', render: r => <StatusBadge status={r.isActive ? 'active' : 'inactive'}>{r.isActive ? 'Active' : 'Hidden'}</StatusBadge> },
  ];

  return (
    <div>
      <button onClick={() => navigate('/rewards')} className="text-sm text-slate-500 hover:text-slate-700 mb-3">← Back to rewards</button>
      <PageHeader title="New Projects / Investment" subtitle={`${rows.length} project${rows.length === 1 ? '' : 's'}`} actionLabel="+ Add project" onAction={() => setModal({ mode: 'create', form: { ...blank } })} />

      <DataTable columns={columns} rows={rows} loading={loading} empty="No projects yet"
        actions={r => (
          <div className="flex justify-end gap-3">
            <button onClick={() => setModal({ mode: 'edit', id: r.id, form: { name: r.name, location: r.location || '', priceFrom: Number(r.priceFrom), status: r.status, description: r.description || '', imageUrl: r.imageUrl || '', isActive: !!r.isActive, sortOrder: r.sortOrder } })} className="text-slate-600 hover:underline">Edit</button>
            <button onClick={() => setDel(r)} className="text-rose-600 hover:underline">Delete</button>
          </div>
        )}
      />

      {modal && (
        <FormModal open title={modal.mode === 'create' ? 'Add project' : 'Edit project'} onClose={() => setModal(null)} onSubmit={save} submitting={busy}>
          {modal.mode === 'create' && (
            <Field label="Code" hint="Short key (e.g. VG). Cannot change later." required>
              <input className={inputClass} value={modal.form.code} onChange={e => setF('code', e.target.value.toUpperCase())} />
            </Field>
          )}
          <Field label="Name" required><input className={inputClass} value={modal.form.name} onChange={e => setF('name', e.target.value)} /></Field>
          <ImageUploader label="Image" value={modal.form.imageUrl} onChange={v => setF('imageUrl', v)} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Location"><input className={inputClass} value={modal.form.location} onChange={e => setF('location', e.target.value)} /></Field>
            <Field label="Price from (₹)"><input type="number" min="0" className={inputClass} value={modal.form.priceFrom} onChange={e => setF('priceFrom', Number(e.target.value))} /></Field>
            <Field label="Stage">
              <select className={inputClass} value={modal.form.status} onChange={e => setF('status', e.target.value)}>
                {PROJECT_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </Field>
            <Field label="Sort order"><input type="number" className={inputClass} value={modal.form.sortOrder} onChange={e => setF('sortOrder', Number(e.target.value))} /></Field>
          </div>
          <Field label="Description"><textarea rows={3} className={inputClass} value={modal.form.description} onChange={e => setF('description', e.target.value)} /></Field>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={modal.form.isActive} onChange={e => setF('isActive', e.target.checked)} /> Active</label>
        </FormModal>
      )}

      <ConfirmDialog open={!!del} title="Delete project?" message={del ? `“${del.name}” will be removed.` : ''} confirmLabel="Delete" danger busy={busy} onCancel={() => setDel(null)} onConfirm={remove} />
    </div>
  );
}
