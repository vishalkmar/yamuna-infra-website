import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../../lib/api';
import { useToast } from '../../../components/Toast';
import PageHeader from '../../../components/PageHeader';
import DataTable from '../../../components/DataTable';
import StatusBadge from '../../../components/StatusBadge';
import ConfirmDialog from '../../../components/ConfirmDialog';
import FormModal, { Field, inputClass } from '../../../components/FormModal';
import { fmtMoney } from '../../../lib/format';

const empty = {
  name: '', scopeType: 'global', projectId: '', tierId: '', calcType: 'percent',
  value: 0, slabsText: '', priority: 0, effectiveFrom: '', effectiveTo: '', isActive: true,
};

function describe(r) {
  if (r.calcType === 'flat') return `₹${r.value} flat`;
  if (r.calcType === 'percent') return `${r.value}% of deal`;
  return 'slab-based';
}

export default function CommissionRules() {
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [delTarget, setDelTarget] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // preview
  const [pv, setPv] = useState({ projectId: '', tierId: '', dealValue: 5000000 });
  const [pvResult, setPvResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/admin/commission/rules'); setRows(data.data); }
    catch (e) { toast.error(apiError(e, 'Could not load rules')); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get('/admin/inventory').then(r => setProjects(r.data.data)).catch(() => {});
    api.get('/admin/agents/tiers').then(r => setTiers(r.data.data)).catch(() => {});
  }, []);

  function openCreate() { setEdit(null); setForm(empty); setFormOpen(true); }
  function openEdit(r) {
    setEdit(r);
    setForm({
      ...empty, ...r, projectId: r.projectId || '', tierId: r.tierId || '',
      slabsText: r.slabs ? JSON.stringify(r.slabs, null, 2) : '',
      effectiveFrom: r.effectiveFrom ? String(r.effectiveFrom).slice(0, 10) : '',
      effectiveTo: r.effectiveTo ? String(r.effectiveTo).slice(0, 10) : '',
    });
    setFormOpen(true);
  }

  async function submit() {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    let slabs = null;
    if (form.calcType === 'slab') {
      try { slabs = JSON.parse(form.slabsText || '[]'); if (!Array.isArray(slabs)) throw new Error(); }
      catch { toast.error('Slabs must be valid JSON array'); return; }
    }
    setBusy(true);
    try {
      const payload = {
        name: form.name, scopeType: form.scopeType,
        projectId: form.scopeType === 'project' && form.projectId ? Number(form.projectId) : null,
        tierId: form.scopeType === 'tier' && form.tierId ? Number(form.tierId) : null,
        calcType: form.calcType, value: Number(form.value) || 0, slabs,
        priority: Number(form.priority) || 0,
        effectiveFrom: form.effectiveFrom || null, effectiveTo: form.effectiveTo || null,
        isActive: !!form.isActive,
      };
      if (edit) await api.put(`/admin/commission/rules/${edit.id}`, payload);
      else await api.post('/admin/commission/rules', payload);
      toast.success(edit ? 'Rule updated' : 'Rule created');
      setFormOpen(false); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function confirmDelete() {
    setBusy(true);
    try { await api.delete(`/admin/commission/rules/${delTarget.id}`); toast.success('Deleted'); setDelTarget(null); load(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function runPreview() {
    try {
      const params = { dealValue: pv.dealValue };
      if (pv.projectId) params.projectId = pv.projectId;
      if (pv.tierId) params.tierId = pv.tierId;
      const { data } = await api.get('/admin/commission/preview', { params });
      setPvResult(data.data);
    } catch (e) { toast.error(apiError(e)); }
  }

  const columns = [
    { key: 'name', header: 'Rule', render: r => <span className="font-medium text-slate-800">{r.name}</span> },
    { key: 'scopeType', header: 'Scope', render: r => r.scopeType === 'project' ? `Project: ${r.projectName || '—'}` : r.scopeType === 'tier' ? `Tier: ${r.tierName || '—'}` : 'Global' },
    { key: 'calc', header: 'Commission', render: r => describe(r) },
    { key: 'priority', header: 'Priority', render: r => r.priority },
    { key: 'isActive', header: 'Active', render: r => <StatusBadge status={r.isActive ? 'active' : 'inactive'}>{r.isActive ? 'Yes' : 'No'}</StatusBadge> },
  ];

  return (
    <div>
      <PageHeader title="Commission Rules" subtitle="How agent commission is computed on bookings">
        <button onClick={() => navigate('/agents/commission/ledger')} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50">Ledger</button>
        <button onClick={openCreate} className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90">+ Add rule</button>
      </PageHeader>

      {/* Preview tool */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
        <h4 className="font-semibold text-slate-700 mb-2">Preview</h4>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm"><span className="block text-slate-500 mb-1">Deal value (₹)</span><input type="number" className={`${inputClass} w-40`} value={pv.dealValue} onChange={e => setPv(p => ({ ...p, dealValue: e.target.value }))} /></label>
          <label className="text-sm"><span className="block text-slate-500 mb-1">Project</span><select className={`${inputClass} w-44`} value={pv.projectId} onChange={e => setPv(p => ({ ...p, projectId: e.target.value }))}><option value="">—</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label className="text-sm"><span className="block text-slate-500 mb-1">Tier</span><select className={`${inputClass} w-36`} value={pv.tierId} onChange={e => setPv(p => ({ ...p, tierId: e.target.value }))}><option value="">—</option>{tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
          <button onClick={runPreview} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50">Compute</button>
          {pvResult && (
            <div className="text-sm">
              <span className="text-slate-500">Rule: </span><b>{pvResult.rule ? pvResult.rule.name : 'none'}</b>
              <span className="text-slate-500 ml-3">Commission: </span><b className="text-brand-primary">{fmtMoney(pvResult.amount)}</b>
            </div>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        empty="No rules yet. Add a global rule as a baseline."
        actions={r => (
          <div className="flex items-center gap-3">
            <button onClick={() => openEdit(r)} className="text-slate-600 font-semibold hover:underline">Edit</button>
            <button onClick={() => setDelTarget(r)} className="text-rose-600 font-semibold hover:underline">Delete</button>
          </div>
        )}
      />

      <FormModal open={formOpen} title={edit ? 'Edit rule' : 'Add rule'} onClose={() => setFormOpen(false)} onSubmit={submit} submitting={busy} submitLabel={edit ? 'Save' : 'Create'} wide>
        <Field label="Name" required><input className={inputClass} value={form.name} onChange={e => set('name', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Scope"><select className={inputClass} value={form.scopeType} onChange={e => set('scopeType', e.target.value)}><option value="global">Global</option><option value="project">Project</option><option value="tier">Tier</option></select></Field>
          {form.scopeType === 'project' && <Field label="Project"><select className={inputClass} value={form.projectId} onChange={e => set('projectId', e.target.value)}><option value="">— Select —</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>}
          {form.scopeType === 'tier' && <Field label="Tier"><select className={inputClass} value={form.tierId} onChange={e => set('tierId', e.target.value)}><option value="">— Select —</option>{tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>}
          <Field label="Type"><select className={inputClass} value={form.calcType} onChange={e => set('calcType', e.target.value)}><option value="percent">Percent of deal</option><option value="flat">Flat amount</option><option value="slab">Slab (JSON)</option></select></Field>
          {form.calcType !== 'slab' && <Field label={form.calcType === 'flat' ? 'Amount (₹)' : 'Percent (%)'}><input type="number" step="0.01" className={inputClass} value={form.value} onChange={e => set('value', e.target.value)} /></Field>}
          <Field label="Priority" hint="Higher wins on ties"><input type="number" className={inputClass} value={form.priority} onChange={e => set('priority', e.target.value)} /></Field>
          <Field label="Effective from"><input type="date" className={inputClass} value={form.effectiveFrom} onChange={e => set('effectiveFrom', e.target.value)} /></Field>
          <Field label="Effective to"><input type="date" className={inputClass} value={form.effectiveTo} onChange={e => set('effectiveTo', e.target.value)} /></Field>
        </div>
        {form.calcType === 'slab' && (
          <Field label="Slabs (JSON)" hint='e.g. [{"min":0,"max":5000000,"type":"percent","value":1.5},{"min":5000001,"max":null,"type":"percent","value":2}]'>
            <textarea className={`${inputClass} font-mono text-xs`} rows={5} value={form.slabsText} onChange={e => set('slabsText', e.target.value)} />
          </Field>
        )}
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={!!form.isActive} onChange={e => set('isActive', e.target.checked)} /> Active</label>
      </FormModal>

      <ConfirmDialog open={!!delTarget} title="Delete rule?" message={`Remove "${delTarget?.name}"?`} confirmLabel="Delete" danger busy={busy} onCancel={() => setDelTarget(null)} onConfirm={confirmDelete} />
    </div>
  );
}
