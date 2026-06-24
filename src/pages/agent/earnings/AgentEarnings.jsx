import React, { useEffect, useState, useCallback } from 'react';
import agentApi, { apiError } from '../../../lib/agentApi';
import { useToast } from '../../../components/Toast';
import DataTable from '../../../components/DataTable';
import StatCard from '../../../components/StatCard';
import StatusBadge from '../../../components/StatusBadge';
import { fmtMoney, fmtDate } from '../../../lib/format';

export default function AgentEarnings() {
  const toast = useToast();
  const [entries, setEntries] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await agentApi.get('/agent/commission');
      setEntries(data.data.entries); setTotals(data.data.totals);
    } catch (e) { toast.error(apiError(e, 'Could not load earnings')); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    { key: 'buyerName', header: 'Booking', render: r => r.buyerName || (r.ruleSnapshot === 'Manual adjustment' ? '(adjustment)' : '—') },
    { key: 'dealValue', header: 'Deal', render: r => r.dealValue ? fmtMoney(r.dealValue) : '—' },
    { key: 'amount', header: 'Commission', render: r => <span className="font-semibold text-brand-primary">{fmtMoney(r.amount)}</span> },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status === 'paid' ? 'paid' : r.status === 'reversed' ? 'cancelled' : r.status === 'approved' ? 'approved' : 'pending'}>{r.status}</StatusBadge> },
    { key: 'createdAt', header: 'Date', render: r => fmtDate(r.createdAt) },
  ];

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-1">Earnings</h2>
      <p className="text-sm text-slate-500 mb-4">Your commission across all approved bookings.</p>

      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatCard label="Lifetime" value={fmtMoney(totals.lifetime)} icon="💰" />
          <StatCard label="Accrued" value={fmtMoney(totals.accrued)} icon="⏳" hint="Awaiting approval" />
          <StatCard label="Approved" value={fmtMoney(totals.approved)} icon="✅" hint="Payable" />
          <StatCard label="Paid" value={fmtMoney(totals.paid)} icon="🏦" />
        </div>
      )}

      <DataTable columns={columns} rows={entries} loading={loading} empty="No earnings yet. Close a booking to start earning." />
    </div>
  );
}
