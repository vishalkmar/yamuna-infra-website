import React, { useEffect, useState, useCallback } from 'react';
import agentApi, { apiError } from '../../lib/agentApi';
import { useToast } from '../../components/Toast';
import { Field, inputClass } from '../../components/FormModal';
import StatusBadge from '../../components/StatusBadge';

const empty = {
  accountHolder: '', accountNumber: '', ifsc: '', bankName: '', branch: '',
  accountType: 'savings', upiId: '', pan: '', gst: '',
};

export default function AgentBank() {
  const toast = useToast();
  const [form, setForm] = useState(empty);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await agentApi.get('/agent/bank');
      const b = data.data.bank || {};
      setForm({
        ...empty,
        accountHolder: b.accountHolder || '',
        accountNumber: b.accountNumber || '',
        ifsc: b.ifsc || '',
        bankName: b.bankName || '',
        branch: b.branch || '',
        accountType: b.accountType || 'savings',
        upiId: b.upiId || '',
        pan: data.data.pan || '',
        gst: data.data.gst || '',
      });
      setVerified(!!b.verified);
    } catch (e) { toast.error(apiError(e, 'Could not load payout details')); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await agentApi.put('/agent/bank', form);
      toast.success('Payout details saved');
      load();
    } catch (err) { toast.error(apiError(err)); } finally { setBusy(false); }
  }

  if (loading) return <div className="text-slate-400">Loading…</div>;

  return (
    <form onSubmit={save} className="max-w-2xl space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">Bank & Payout Details</h2>
          <StatusBadge status={verified ? 'approved' : 'pending'}>{verified ? 'Verified' : 'Not verified'}</StatusBadge>
        </div>
        {!verified && <p className="text-sm text-amber-600 mb-4">Your account will be verified by the office before any payout. Editing resets verification.</p>}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Account holder name"><input className={inputClass} value={form.accountHolder} onChange={e => set('accountHolder', e.target.value)} /></Field>
          <Field label="Account number"><input className={inputClass} value={form.accountNumber} onChange={e => set('accountNumber', e.target.value)} /></Field>
          <Field label="IFSC"><input className={inputClass} value={form.ifsc} onChange={e => set('ifsc', e.target.value)} /></Field>
          <Field label="Account type"><select className={inputClass} value={form.accountType} onChange={e => set('accountType', e.target.value)}><option value="savings">Savings</option><option value="current">Current</option></select></Field>
          <Field label="Bank name"><input className={inputClass} value={form.bankName} onChange={e => set('bankName', e.target.value)} /></Field>
          <Field label="Branch"><input className={inputClass} value={form.branch} onChange={e => set('branch', e.target.value)} /></Field>
          <Field label="UPI ID (optional)"><input className={inputClass} value={form.upiId} onChange={e => set('upiId', e.target.value)} /></Field>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-700 mb-4">Tax (TDS profile)</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="PAN"><input className={inputClass} value={form.pan} onChange={e => set('pan', e.target.value)} /></Field>
          <Field label="GST (optional)"><input className={inputClass} value={form.gst} onChange={e => set('gst', e.target.value)} /></Field>
        </div>
      </div>

      <button type="submit" disabled={busy} className="px-5 py-2.5 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50">
        {busy ? 'Saving…' : 'Save payout details'}
      </button>
    </form>
  );
}
