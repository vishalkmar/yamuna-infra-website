import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import FormModal, { Field, inputClass } from '../../components/FormModal';
import { fmtDateTime } from '../../lib/format';

const ROLES = ['superadmin', 'manager', 'support'];
const blankCreate = { name: '', email: '', password: '', role: 'manager', isActive: true };

export default function Admins() {
  const navigate = useNavigate();
  const toast = useToast();
  const { admin: me } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/admin/admins'); setRows(data.data); }
    catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  const setF = (k, v) => setModal(m => ({ ...m, form: { ...m.form, [k]: v } }));

  async function save() {
    const { mode, form, id } = modal;
    setBusy(true);
    try {
      if (mode === 'create') {
        await api.post('/admin/admins', form);
        toast.success('Admin created');
      } else {
        const payload = { name: form.name, role: form.role, isActive: form.isActive };
        if (form.password) payload.password = form.password;
        await api.put(`/admin/admins/${id}`, payload);
        toast.success('Admin updated');
      }
      setModal(null); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const columns = [
    { key: 'name', header: 'Admin', render: r => (
      <div><div className="font-medium text-slate-800">{r.name} {r.id === me?.id ? <span className="text-xs text-slate-400">(you)</span> : ''}</div><div className="text-xs text-slate-400">{r.email}</div></div>
    ) },
    { key: 'role', header: 'Role', render: r => <span className="text-xs font-semibold uppercase tracking-wide bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{r.role}</span> },
    { key: 'lastLoginAt', header: 'Last login', render: r => r.lastLoginAt ? fmtDateTime(r.lastLoginAt) : '—' },
    { key: 'isActive', header: 'Status', render: r => <StatusBadge status={r.isActive ? 'active' : 'inactive'}>{r.isActive ? 'Active' : 'Disabled'}</StatusBadge> },
  ];

  return (
    <div>
      <button onClick={() => navigate('/audit')} className="text-sm text-slate-500 hover:text-slate-700 mb-3">← Back to audit logs</button>
      <PageHeader title="Admin Team" subtitle={`${rows.length} admin${rows.length === 1 ? '' : 's'}`} actionLabel="+ Add admin" onAction={() => setModal({ mode: 'create', form: { ...blankCreate } })} />

      <DataTable columns={columns} rows={rows} loading={loading} empty="No admins"
        actions={r => (
          <button onClick={() => setModal({ mode: 'edit', id: r.id, form: { name: r.name, email: r.email, role: r.role, isActive: !!r.isActive, password: '' } })} className="text-slate-600 hover:underline">Edit</button>
        )}
      />

      {modal && (
        <FormModal open title={modal.mode === 'create' ? 'Add admin' : 'Edit admin'} onClose={() => setModal(null)} onSubmit={save} submitting={busy}>
          <Field label="Name" required><input className={inputClass} value={modal.form.name} onChange={e => setF('name', e.target.value)} /></Field>
          <Field label="Email" required>
            <input type="email" className={inputClass} value={modal.form.email} onChange={e => setF('email', e.target.value)} disabled={modal.mode === 'edit'} />
          </Field>
          <Field label={modal.mode === 'create' ? 'Password' : 'New password (optional)'} hint="At least 8 characters" required={modal.mode === 'create'}>
            <input type="password" className={inputClass} value={modal.form.password} onChange={e => setF('password', e.target.value)} placeholder={modal.mode === 'edit' ? 'Leave blank to keep' : ''} />
          </Field>
          <Field label="Role" required>
            <select className={inputClass} value={modal.form.role} onChange={e => setF('role', e.target.value)}>
              {ROLES.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={modal.form.isActive} onChange={e => setF('isActive', e.target.checked)} /> Active (can log in)</label>
        </FormModal>
      )}
    </div>
  );
}
