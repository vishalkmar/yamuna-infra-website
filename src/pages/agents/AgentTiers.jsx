import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormModal, { Field, inputClass } from '../../components/FormModal';

const empty = { code: '', name: '', description: '', defaultCommissionPct: 0, perks: '', isActive: true, sortOrder: 0 };

export default function AgentTiers() {
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [delTarget, setDelTarget] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/agents/tiers');
      setRows(data.data);
    } catch (e) { toast.error(apiError(e, 'Could not load tiers')); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setEdit(null); setForm(empty); setFormOpen(true); }
  function openEdit(r) { setEdit(r); setForm({ ...empty, ...r }); setFormOpen(true); }

  async function submit() {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!edit && !form.code.trim()) { toast.error('Code is required'); return; }
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        defaultCommissionPct: Number(form.defaultCommissionPct) || 0,
        perks: form.perks || null,
        isActive: !!form.isActive,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (edit) await api.put(`/admin/agents/tiers/${edit.id}`, payload);
      else await api.post('/admin/agents/tiers', { ...payload, code: form.code });
      toast.success(edit ? 'Tier updated' : 'Tier created');
      setFormOpen(false);
      load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      await api.delete(`/admin/agents/tiers/${delTarget.id}`);
      toast.success('Tier deleted');
      setDelTarget(null);
      load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const columns = [
    { key: 'name', header: 'Tier', render: r => <span className="font-medium text-slate-800">{r.name}</span> },
    { key: 'code', header: 'Code', render: r => <span className="text-slate-500">{r.code}</span> },
    { key: 'defaultCommissionPct', header: 'Default %', render: r => `${r.defaultCommissionPct}%` },
    { key: 'agentCount', header: 'Agents', render: r => r.agentCount || 0 },
    { key: 'isActive', header: 'Status', render: r => <StatusBadge status={r.isActive ? 'active' : 'inactive'}>{r.isActive ? 'Active' : 'Inactive'}</StatusBadge> },
  ];

  return (
    <div>
      <PageHeader title="Agent Tiers" subtitle="Channel-partner categories & default commission">
        <button onClick={() => navigate('/agents')} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50">← Agents</button>
        <button onClick={openCreate} className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90">+ Add tier</button>
      </PageHeader>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        empty="No tiers yet."
        actions={r => (
          <div className="flex items-center gap-3">
            <button onClick={() => openEdit(r)} className="text-slate-600 font-semibold hover:underline">Edit</button>
            <button onClick={() => setDelTarget(r)} className="text-rose-600 font-semibold hover:underline">Delete</button>
          </div>
        )}
      />

      <FormModal open={formOpen} title={edit ? 'Edit tier' : 'Add tier'} onClose={() => setFormOpen(false)} onSubmit={submit} submitting={busy} submitLabel={edit ? 'Save' : 'Create'}>
        {!edit && <Field label="Code" hint="Immutable lookup key, e.g. gold" required><input className={inputClass} value={form.code} onChange={e => set('code', e.target.value)} /></Field>}
        <Field label="Name" required><input className={inputClass} value={form.name} onChange={e => set('name', e.target.value)} /></Field>
        <Field label="Description"><textarea className={inputClass} rows={2} value={form.description || ''} onChange={e => set('description', e.target.value)} /></Field>
        <Field label="Default commission %" hint="Used as the default in the commission rules engine (Phase 4)"><input type="number" step="0.01" className={inputClass} value={form.defaultCommissionPct} onChange={e => set('defaultCommissionPct', e.target.value)} /></Field>
        <Field label="Perks"><input className={inputClass} value={form.perks || ''} onChange={e => set('perks', e.target.value)} /></Field>
        <Field label="Sort order"><input type="number" className={inputClass} value={form.sortOrder} onChange={e => set('sortOrder', e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={!!form.isActive} onChange={e => set('isActive', e.target.checked)} /> Active
        </label>
      </FormModal>

      <ConfirmDialog
        open={!!delTarget}
        title="Delete tier?"
        message={`Remove "${delTarget?.name}"? Blocked if any agent still uses it.`}
        confirmLabel="Delete"
        danger
        busy={busy}
        onCancel={() => setDelTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
