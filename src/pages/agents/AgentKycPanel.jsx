import React, { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
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

// Admin KYC review for one agent. `kycStatus` is the agent's current overall
// status; `onChanged` reloads the parent agent after a KYC decision.
export default function AgentKycPanel({ agentId, kycStatus, onChanged }) {
  const toast = useToast();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ docType: 'pan', label: '', url: '' });
  const [reviewTarget, setReviewTarget] = useState(null); // { docId } for reject reason
  const [reason, setReason] = useState('');
  const [kycReject, setKycReject] = useState(false);
  const [kycReason, setKycReason] = useState('');
  const [delTarget, setDelTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/agents/${agentId}/documents`);
      setDocs(data.data);
    } catch (e) { toast.error(apiError(e, 'Could not load documents')); } finally { setLoading(false); }
  }, [agentId, toast]);

  useEffect(() => { load(); }, [load]);

  async function reviewDoc(docId, status, reasonText = null) {
    setBusy(true);
    try {
      await api.post(`/admin/agents/documents/${docId}/review`, { status, reason: reasonText });
      toast.success('Document reviewed');
      setReviewTarget(null); setReason('');
      load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function setKyc(status, reasonText = null) {
    setBusy(true);
    try {
      await api.post(`/admin/agents/${agentId}/kyc`, { status, reason: reasonText });
      toast.success('KYC updated');
      setKycReject(false); setKycReason('');
      onChanged && onChanged();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function addDoc() {
    if (!addForm.url) { toast.error('Upload a file or paste a link'); return; }
    setBusy(true);
    try {
      await api.post(`/admin/agents/${agentId}/documents`, addForm);
      toast.success('Document added');
      setAddOpen(false); setAddForm({ docType: 'pan', label: '', url: '' });
      load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      await api.delete(`/admin/agents/documents/${delTarget.id}`);
      toast.success('Document deleted');
      setDelTarget(null);
      load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-slate-700">KYC & Documents</h4>
          <StatusBadge status={kycStatus}>{kycStatus}</StatusBadge>
        </div>
        <div className="flex items-center gap-2">
          {kycStatus !== 'approved' && <button onClick={() => setKyc('approved')} disabled={busy} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50">Approve KYC</button>}
          {kycStatus !== 'rejected' && <button onClick={() => setKycReject(true)} disabled={busy} className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-sm font-semibold disabled:opacity-50">Reject KYC</button>}
          <button onClick={() => setAddOpen(true)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50">+ Add</button>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm py-4">Loading…</p>
      ) : docs.length === 0 ? (
        <p className="text-slate-400 text-sm py-4">No documents submitted yet.</p>
      ) : (
        <div className="space-y-2">
          {docs.map(d => (
            <div key={d.id} className="flex items-center gap-3 border border-slate-100 rounded-lg p-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800 text-sm">{typeLabel(d.docType)}</span>
                  <StatusBadge status={d.status}>{d.status}</StatusBadge>
                </div>
                <div className="text-xs text-slate-400 truncate">{d.label || ''} · {fmtDate(d.createdAt)}{d.reviewedBy ? ` · by ${d.reviewedBy}` : ''}</div>
                {d.rejectReason && <div className="text-xs text-rose-600">Reason: {d.rejectReason}</div>}
              </div>
              <a href={d.url} target="_blank" rel="noreferrer" className="text-brand-primary text-sm font-semibold hover:underline shrink-0">View</a>
              {d.status !== 'approved' && <button onClick={() => reviewDoc(d.id, 'approved')} disabled={busy} className="text-emerald-600 text-sm font-semibold hover:underline shrink-0">Approve</button>}
              {d.status !== 'rejected' && <button onClick={() => { setReviewTarget(d); setReason(''); }} className="text-amber-600 text-sm font-semibold hover:underline shrink-0">Reject</button>}
              <button onClick={() => setDelTarget(d)} className="text-rose-600 text-sm font-semibold hover:underline shrink-0">Delete</button>
            </div>
          ))}
        </div>
      )}

      {/* Add document */}
      <FormModal open={addOpen} title="Add document" onClose={() => setAddOpen(false)} onSubmit={addDoc} submitting={busy} submitLabel="Add">
        <Field label="Type"><select className={inputClass} value={addForm.docType} onChange={e => setAddForm(f => ({ ...f, docType: e.target.value }))}>{DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
        <Field label="Label"><input className={inputClass} value={addForm.label} onChange={e => setAddForm(f => ({ ...f, label: e.target.value }))} /></Field>
        <Field label="File / image"><ImageUploader value={addForm.url} onChange={url => setAddForm(f => ({ ...f, url }))} label="KYC document" /></Field>
      </FormModal>

      {/* Reject a single document */}
      <FormModal open={!!reviewTarget} title="Reject document" onClose={() => setReviewTarget(null)} onSubmit={() => reviewDoc(reviewTarget.id, 'rejected', reason)} submitting={busy} submitLabel="Reject">
        <Field label="Reason" hint="Shown to the agent"><textarea className={inputClass} rows={3} value={reason} onChange={e => setReason(e.target.value)} /></Field>
      </FormModal>

      {/* Reject overall KYC */}
      <FormModal open={kycReject} title="Reject KYC" onClose={() => setKycReject(false)} onSubmit={() => setKyc('rejected', kycReason)} submitting={busy} submitLabel="Reject KYC">
        <Field label="Reason" hint="Shown to the agent"><textarea className={inputClass} rows={3} value={kycReason} onChange={e => setKycReason(e.target.value)} /></Field>
      </FormModal>

      <ConfirmDialog
        open={!!delTarget}
        title="Delete document?"
        message="This permanently removes the document."
        confirmLabel="Delete"
        danger
        busy={busy}
        onCancel={() => setDelTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
