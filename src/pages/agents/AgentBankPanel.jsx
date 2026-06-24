import React, { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import StatusBadge from '../../components/StatusBadge';

function Row({ label, value, mask }) {
  let shown = value || '—';
  if (mask && value && value.length > 4) shown = '••••' + value.slice(-4);
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-slate-500 text-sm">{label}</span>
      <span className="text-slate-800 text-sm font-medium text-right">{shown}</span>
    </div>
  );
}

// Admin view of an agent's bank/payout details + verify toggle.
export default function AgentBankPanel({ agentId }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get(`/admin/agents/${agentId}/bank`);
      setData(res.data);
    } catch (e) { toast.error(apiError(e, 'Could not load bank details')); } finally { setLoading(false); }
  }, [agentId, toast]);

  useEffect(() => { load(); }, [load]);

  async function setVerified(verified) {
    setBusy(true);
    try {
      await api.post(`/admin/agents/${agentId}/bank/verify`, { verified });
      toast.success('Verification updated');
      load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const bank = data?.bank;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-slate-700">Bank & Payout</h4>
        {bank && <StatusBadge status={bank.verified ? 'approved' : 'pending'}>{bank.verified ? 'Verified' : 'Not verified'}</StatusBadge>}
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm py-2">Loading…</p>
      ) : !bank ? (
        <p className="text-slate-400 text-sm py-2">Agent has not added bank details yet.</p>
      ) : (
        <>
          <Row label="Account holder" value={bank.accountHolder} />
          <Row label="Account number" value={bank.accountNumber} mask />
          <Row label="IFSC" value={bank.ifsc} />
          <Row label="Bank" value={bank.bankName} />
          <Row label="Branch" value={bank.branch} />
          <Row label="Type" value={bank.accountType} />
          <Row label="UPI" value={bank.upiId} />
          <Row label="PAN" value={data.pan} />
          <Row label="GST" value={data.gst} />
          {bank.verifiedBy && <Row label="Verified by" value={bank.verifiedBy} />}
          <div className="flex gap-2 mt-3">
            {!bank.verified
              ? <button onClick={() => setVerified(true)} disabled={busy} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50">Mark verified</button>
              : <button onClick={() => setVerified(false)} disabled={busy} className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50">Un-verify</button>}
          </div>
        </>
      )}
    </div>
  );
}
