import React, { useEffect, useState, useCallback } from 'react';
import agentApi, { apiError } from '../../../lib/agentApi';
import { useToast } from '../../../components/Toast';
import DataTable from '../../../components/DataTable';
import StatCard from '../../../components/StatCard';
import StatusBadge from '../../../components/StatusBadge';
import { fmtMoney, fmtDate } from '../../../lib/format';

export default function AgentPayouts() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        agentApi.get('/agent/payouts'),
        agentApi.get('/agent/commission'),
      ]);
      setRows(p.data.data);
      setTotals(c.data.data.totals);
    } catch (e) { toast.error(apiError(e, 'Could not load payouts')); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function request() {
    setBusy(true);
    try { const { data } = await agentApi.post('/agent/payouts'); toast.success(`Requested ${fmtMoney(data.data.amount)}`); load(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function downloadStatement(r) {
    try {
      const res = await agentApi.get(`/agent/payouts/${r.id}/statement.pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = `payout-${r.id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error(apiError(e, 'Download failed')); }
  }

  const columns = [
    { key: 'amount', header: 'Amount', render: r => <span className="font-semibold text-brand-primary">{fmtMoney(r.amount)}</span> },
    { key: 'net', header: 'Net', render: r => fmtMoney(r.net) },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status === 'paid' ? 'paid' : r.status === 'rejected' ? 'cancelled' : r.status === 'approved' ? 'approved' : 'pending'}>{r.status}</StatusBadge> },
    { key: 'txnRef', header: 'Txn', render: r => r.txnRef || '—' },
    { key: 'createdAt', header: 'Requested', render: r => fmtDate(r.createdAt) },
  ];

  const canRequest = totals && totals.approved > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div><h2 className="text-lg font-bold text-slate-800">Payouts</h2><p className="text-sm text-slate-500">Withdraw your approved commission</p></div>
        <button onClick={request} disabled={busy || !canRequest} className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50" title={canRequest ? '' : 'No approved commission to withdraw'}>
          Request payout
        </button>
      </div>

      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatCard label="Approved (payable)" value={fmtMoney(totals.approved)} icon="✅" />
          <StatCard label="Accrued" value={fmtMoney(totals.accrued)} icon="⏳" />
          <StatCard label="Paid" value={fmtMoney(totals.paid)} icon="🏦" />
          <StatCard label="Lifetime" value={fmtMoney(totals.lifetime)} icon="💰" />
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        empty="No payout requests yet. Approved commission can be withdrawn here."
        actions={r => <button onClick={() => downloadStatement(r)} className="text-brand-primary font-semibold hover:underline">Statement</button>}
      />
    </div>
  );
}
