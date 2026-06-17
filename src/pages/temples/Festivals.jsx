import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormModal, { Field, inputClass } from '../../components/FormModal';
import { fmtDate } from '../../lib/format';

const blank = { name: '', festivalDate: '', significance: '', isActive: true };

export default function Festivals() {
  const { templeId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [temple, setTemple] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/temples/${templeId}/festivals`);
      setTemple(data.data.temple); setRows(data.data.festivals);
    } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [templeId, toast]);

  useEffect(() => { load(); }, [load]);
  const setF = (k, v) => setModal(m => ({ ...m, form: { ...m.form, [k]: v } }));

  async function save() {
    const { mode, form, id } = modal;
    setBusy(true);
    try {
      if (mode === 'create') await api.post(`/admin/temples/${templeId}/festivals`, form);
      else await api.put(`/admin/temples/festivals/${id}`, form);
      toast.success(`Festival ${mode === 'create' ? 'added' : 'updated'}`);
      setModal(null); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    try { await api.delete(`/admin/temples/festivals/${del.id}`); toast.success('Festival deleted'); setDel(null); load(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const columns = [
    { key: 'name', header: 'Festival', render: r => <span className="font-medium text-slate-800">{r.name}</span> },
    { key: 'festivalDate', header: 'Date', render: r => fmtDate(r.festivalDate) },
    { key: 'significance', header: 'Significance', render: r => <span className="text-slate-500">{r.significance || '—'}</span> },
    { key: 'isActive', header: 'Status', render: r => <StatusBadge status={r.isActive ? 'active' : 'inactive'}>{r.isActive ? 'Active' : 'Hidden'}</StatusBadge> },
  ];

  return (
    <div>
      <button onClick={() => navigate('/temples')} className="text-sm text-slate-500 hover:text-slate-700 mb-3">← Back to temples</button>
      <PageHeader title={`${temple?.name || 'Temple'} — Festivals`} subtitle={`${rows.length} festival${rows.length === 1 ? '' : 's'}`} actionLabel="+ Add festival" onAction={() => setModal({ mode: 'create', form: { ...blank } })} />

      <DataTable columns={columns} rows={rows} loading={loading} empty="No festivals yet"
        actions={r => (
          <div className="flex justify-end gap-3">
            <button onClick={() => setModal({ mode: 'edit', id: r.id, form: { name: r.name, festivalDate: r.festivalDate || '', significance: r.significance || '', isActive: !!r.isActive } })} className="text-slate-600 hover:underline">Edit</button>
            <button onClick={() => setDel(r)} className="text-rose-600 hover:underline">Delete</button>
          </div>
        )}
      />

      {modal && (
        <FormModal open title={modal.mode === 'create' ? 'Add festival' : 'Edit festival'} onClose={() => setModal(null)} onSubmit={save} submitting={busy}>
          <Field label="Name" required><input className={inputClass} value={modal.form.name} onChange={e => setF('name', e.target.value)} placeholder="e.g. Janmashtami" /></Field>
          <Field label="Date"><input type="date" className={inputClass} value={modal.form.festivalDate} onChange={e => setF('festivalDate', e.target.value)} /></Field>
          <Field label="Significance"><textarea rows={2} className={inputClass} value={modal.form.significance} onChange={e => setF('significance', e.target.value)} /></Field>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={modal.form.isActive} onChange={e => setF('isActive', e.target.checked)} /> Active</label>
        </FormModal>
      )}

      <ConfirmDialog open={!!del} title="Delete festival?" message={del ? `“${del.name}” will be removed.` : ''} confirmLabel="Delete" danger busy={busy} onCancel={() => setDel(null)} onConfirm={remove} />
    </div>
  );
}
