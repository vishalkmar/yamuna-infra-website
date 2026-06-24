import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormModal, { Field, inputClass } from '../../components/FormModal';
import AgentFormModal from './AgentFormModal';
import AgentKycPanel from './AgentKycPanel';
import AgentBankPanel from './AgentBankPanel';
import AgentActivityPanel from './AgentActivityPanel';
import { fmtDateTime } from '../../lib/format';

const TYPE_LABEL = {
  channel_partner: 'Channel Partner', broker: 'Broker', in_house: 'In-house', freelancer: 'Freelancer',
};

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-slate-100 last:border-0">
      <span className="text-slate-500 text-sm">{label}</span>
      <span className="text-slate-800 text-sm font-medium text-right">{value || '—'}</span>
    </div>
  );
}

export default function AgentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reasonModal, setReasonModal] = useState(null); // { status, label }
  const [reason, setReason] = useState('');
  const [pwdOpen, setPwdOpen] = useState(false);
  const [newPwd, setNewPwd] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/agents/${id}`);
      setAgent(data.data);
    } catch (e) {
      toast.error(apiError(e, 'Could not load agent'));
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(status, reasonText = null) {
    setBusy(true);
    try {
      await api.post(`/admin/agents/${id}/status`, { status, reason: reasonText });
      toast.success('Status updated');
      setReasonModal(null); setReason('');
      load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function resetPassword() {
    if (newPwd.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setBusy(true);
    try {
      await api.post(`/admin/agents/${id}/reset-password`, { newPassword: newPwd });
      toast.success('Password reset');
      setPwdOpen(false); setNewPwd('');
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      await api.delete(`/admin/agents/${id}`);
      toast.success('Agent deleted');
      navigate('/agents');
    } catch (e) { toast.error(apiError(e)); setBusy(false); }
  }

  if (loading) return <div className="text-slate-400">Loading…</div>;
  if (!agent) return <div className="text-slate-400">Agent not found.</div>;

  const statusActions = [];
  if (agent.status === 'pending') {
    statusActions.push({ label: 'Approve', cls: 'bg-emerald-600', fn: () => setStatus('active') });
    statusActions.push({ label: 'Reject', cls: 'bg-rose-600', fn: () => setReasonModal({ status: 'rejected', label: 'Reject agent' }) });
  } else if (agent.status === 'active') {
    statusActions.push({ label: 'Suspend', cls: 'bg-amber-600', fn: () => setReasonModal({ status: 'suspended', label: 'Suspend agent' }) });
  } else if (agent.status === 'suspended' || agent.status === 'rejected') {
    statusActions.push({ label: 'Reactivate', cls: 'bg-emerald-600', fn: () => setStatus('active') });
  }

  return (
    <div>
      <PageHeader title={agent.name} subtitle={`${TYPE_LABEL[agent.agentType] || agent.agentType} · ${agent.referralCode || ''}`}>
        <button onClick={() => navigate('/agents')} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50">← Back</button>
        <button onClick={() => setEditOpen(true)} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50">Edit</button>
      </PageHeader>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
            {agent.photoUrl
              ? <img src={agent.photoUrl} alt="" className="w-20 h-20 rounded-full object-cover mx-auto border border-slate-200" />
              : <div className="w-20 h-20 rounded-full bg-brand-primary/10 text-brand-primary grid place-items-center text-2xl font-extrabold mx-auto">{(agent.name || 'A').charAt(0).toUpperCase()}</div>}
            <h3 className="font-bold text-slate-800 mt-3">{agent.name}</h3>
            <p className="text-sm text-slate-500">{agent.companyName || '—'}</p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <StatusBadge status={agent.status}>{agent.status}</StatusBadge>
              <StatusBadge status={agent.kycStatus}>KYC: {agent.kycStatus}</StatusBadge>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h4 className="font-semibold text-slate-700 mb-2">Actions</h4>
            <div className="flex flex-wrap gap-2">
              {statusActions.map(a => (
                <button key={a.label} onClick={a.fn} disabled={busy} className={`px-3 py-1.5 rounded-lg text-white text-sm font-semibold disabled:opacity-50 ${a.cls}`}>{a.label}</button>
              ))}
              <button onClick={() => setPwdOpen(true)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50">Reset password</button>
              <button onClick={() => setDelOpen(true)} className="px-3 py-1.5 rounded-lg border border-rose-300 text-sm font-semibold text-rose-600 hover:bg-rose-50">Delete</button>
            </div>
            {agent.rejectReason && <p className="text-xs text-rose-600 mt-3">Reason: {agent.rejectReason}</p>}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h4 className="font-semibold text-slate-700 mb-2">Profile</h4>
            <Row label="Email" value={agent.email} />
            <Row label="Phone" value={agent.phone} />
            <Row label="Type" value={TYPE_LABEL[agent.agentType] || agent.agentType} />
            <Row label="Tier" value={agent.tierName} />
            <Row label="Referral code" value={agent.referralCode} />
            <Row label="City / State" value={[agent.city, agent.state].filter(Boolean).join(', ')} />
            <Row label="PAN" value={agent.pan} />
            <Row label="GST" value={agent.gst} />
            <Row label="Source" value={agent.createdSource} />
            <Row label="Last login" value={agent.lastLoginAt ? fmtDateTime(agent.lastLoginAt) : 'Never'} />
            <Row label="Joined" value={fmtDateTime(agent.createdAt)} />
            {agent.adminNotes && <Row label="Notes" value={agent.adminNotes} />}
          </div>

          <AgentKycPanel agentId={agent.id} kycStatus={agent.kycStatus} onChanged={load} />

          <AgentBankPanel agentId={agent.id} />

          <AgentActivityPanel agentId={agent.id} />
        </div>
      </div>

      <AgentFormModal open={editOpen} mode="edit" initial={agent} onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); load(); }} />

      <FormModal
        open={!!reasonModal}
        title={reasonModal?.label || 'Reason'}
        onClose={() => { setReasonModal(null); setReason(''); }}
        onSubmit={() => setStatus(reasonModal.status, reason)}
        submitting={busy}
        submitLabel="Confirm"
      >
        <Field label="Reason" hint="Shown to the agent / kept on record">
          <textarea className={inputClass} rows={3} value={reason} onChange={e => setReason(e.target.value)} />
        </Field>
      </FormModal>

      <FormModal
        open={pwdOpen}
        title="Reset password"
        onClose={() => { setPwdOpen(false); setNewPwd(''); }}
        onSubmit={resetPassword}
        submitting={busy}
        submitLabel="Reset"
      >
        <Field label="New password" hint="Min 8 characters" required>
          <input type="password" className={inputClass} value={newPwd} onChange={e => setNewPwd(e.target.value)} />
        </Field>
      </FormModal>

      <ConfirmDialog
        open={delOpen}
        title="Delete agent?"
        message={`This permanently removes ${agent.name}. Leads/bookings will keep their reference but show no agent. This cannot be undone.`}
        confirmLabel="Delete"
        danger
        busy={busy}
        onCancel={() => setDelOpen(false)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
