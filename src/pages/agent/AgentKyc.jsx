import React, { useEffect, useState, useCallback } from 'react';
import agentApi, { apiError } from '../../lib/agentApi';
import { useToast } from '../../components/Toast';
import { useAgentAuth } from '../../context/AgentAuthContext';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormModal, { Field, inputClass } from '../../components/FormModal';
import ImageUploader from '../../components/ImageUploader';
import { fmtDate } from '../../lib/format';

const DOC_TYPES = [
  { value: 'pan', label: 'PAN card' },
  { value: 'aadhaar', label: 'Aadhaar' },
  { value: 'gst', label: 'GST certificate' },
  { value: 'rera', label: 'RERA registration' },
  { value: 'cheque', label: 'Cancelled cheque' },
  { value: 'agreement', label: 'Agreement' },
  { value: 'photo', label: 'Photo' },
  { value: 'other', label: 'Other' },
];
const typeLabel = v => (DOC_TYPES.find(t => t.value === v) || {}).label || v;

export default function AgentKyc() {
  const toast = useToast();
  const { refresh } = useAgentAuth();
  const [info, setInfo] = useState({ kycStatus: 'none', kycRejectReason: null, documents: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ docType: 'pan', label: '', url: '' });
  const [delTarget, setDelTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await agentApi.get('/agent/kyc');
      setInfo(data.data);
    } catch (e) { toast.error(apiError(e, 'Could not load KYC')); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function submit() {
    if (!form.url) { toast.error('Upload a file or paste a link'); return; }
    setBusy(true);
    try {
      await agentApi.post('/agent/kyc', form);
      toast.success('Document submitted for review');
      setAddOpen(false); setForm({ docType: 'pan', label: '', url: '' });
      load(); refresh();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      await agentApi.delete(`/agent/kyc/${delTarget.id}`);
      toast.success('Document removed');
      setDelTarget(null);
      load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800">KYC Verification</h2>
            <StatusBadge status={info.kycStatus}>{info.kycStatus}</StatusBadge>
          </div>
          <button onClick={() => setAddOpen(true)} className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90">+ Upload document</button>
        </div>
        {info.kycStatus === 'approved' && <p className="text-sm text-emerald-600 mt-2">✅ Your KYC is verified.</p>}
        {info.kycStatus === 'pending' && <p className="text-sm text-amber-600 mt-2">⏳ Documents under review.</p>}
        {info.kycStatus === 'rejected' && <p className="text-sm text-rose-600 mt-2">❌ KYC rejected{info.kycRejectReason ? `: ${info.kycRejectReason}` : ''}. Please re-upload.</p>}
        {info.kycStatus === 'none' && <p className="text-sm text-slate-500 mt-2">Upload your documents (PAN, Aadhaar, etc.) to get verified.</p>}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-700 mb-3">My documents</h3>
        {loading ? (
          <p className="text-slate-400 text-sm py-4">Loading…</p>
        ) : info.documents.length === 0 ? (
          <p className="text-slate-400 text-sm py-4">No documents yet.</p>
        ) : (
          <div className="space-y-2">
            {info.documents.map(d => (
              <div key={d.id} className="flex items-center gap-3 border border-slate-100 rounded-lg p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800 text-sm">{typeLabel(d.docType)}</span>
                    <StatusBadge status={d.status}>{d.status}</StatusBadge>
                  </div>
                  <div className="text-xs text-slate-400 truncate">{d.label || ''} · {fmtDate(d.createdAt)}</div>
                  {d.rejectReason && <div className="text-xs text-rose-600">Reason: {d.rejectReason}</div>}
                </div>
                <a href={d.url} target="_blank" rel="noreferrer" className="text-brand-primary text-sm font-semibold hover:underline shrink-0">View</a>
                {d.status === 'pending' && <button onClick={() => setDelTarget(d)} className="text-rose-600 text-sm font-semibold hover:underline shrink-0">Remove</button>}
              </div>
            ))}
          </div>
        )}
      </div>

      <FormModal open={addOpen} title="Upload document" onClose={() => setAddOpen(false)} onSubmit={submit} submitting={busy} submitLabel="Submit">
        <Field label="Type"><select className={inputClass} value={form.docType} onChange={e => setForm(f => ({ ...f, docType: e.target.value }))}>{DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
        <Field label="Label (optional)"><input className={inputClass} value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} /></Field>
        <Field label="File / image"><ImageUploader value={form.url} onChange={url => setForm(f => ({ ...f, url }))} label="KYC document" /></Field>
      </FormModal>

      <ConfirmDialog
        open={!!delTarget}
        title="Remove document?"
        message="This removes the pending document."
        confirmLabel="Remove"
        danger
        busy={busy}
        onCancel={() => setDelTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
