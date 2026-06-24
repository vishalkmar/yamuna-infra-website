import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import { fmtMoney } from '../../lib/format';

export default function AmsDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const { data } = await api.get('/admin/agents/dashboard'); setD(data.data); }
      catch (e) { toast.error(apiError(e, 'Could not load dashboard')); } finally { setLoading(false); }
    })();
  }, [toast]);

  if (loading) return <div className="text-slate-400">Loading…</div>;
  if (!d) return null;

  const Section = ({ title, children, to }) => (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-slate-700">{title}</h3>
        {to && <button onClick={() => navigate(to)} className="text-sm text-brand-primary font-semibold hover:underline">Open →</button>}
      </div>
      {children}
    </div>
  );

  return (
    <div>
      <PageHeader title="Agent Management — Overview" subtitle="Channel partner performance at a glance" />

      <Section title="Agents" to="/agents">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label="Total" value={d.agents.total} icon="🤝" />
          <StatCard label="Active" value={d.agents.active} icon="✅" />
          <StatCard label="Pending" value={d.agents.pending} icon="⏳" />
          <StatCard label="Suspended" value={d.agents.suspended} icon="⛔" />
          <StatCard label="KYC pending" value={d.agents.kycPending} icon="📋" />
        </div>
      </Section>

      <Section title="Leads / CRM" to="/agents/leads">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label="Total" value={d.leads.total} icon="📇" />
          <StatCard label="New" value={d.leads.new} icon="🆕" />
          <StatCard label="Site visit" value={d.leads.siteVisit} icon="📅" />
          <StatCard label="Booked" value={d.leads.booked} icon="✅" />
          <StatCard label="Lost" value={d.leads.lost} icon="❌" />
        </div>
      </Section>

      <Section title="Bookings" to="/agents/bookings">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total" value={d.bookings.total} icon="🧾" />
          <StatCard label="Pending" value={d.bookings.pending} icon="⏳" />
          <StatCard label="Approved" value={d.bookings.approved} icon="✅" />
          <StatCard label="Approved value" value={fmtMoney(d.bookings.approvedValue)} icon="💰" />
        </div>
      </Section>

      <Section title="Commission & Payouts" to="/agents/payouts">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label="Accrued" value={fmtMoney(d.commission.accrued)} icon="⏳" />
          <StatCard label="Approved" value={fmtMoney(d.commission.approved)} icon="✅" />
          <StatCard label="Paid" value={fmtMoney(d.commission.paid)} icon="🏦" />
          <StatCard label="Payouts pending" value={fmtMoney(d.payouts.pending)} icon="📤" />
          <StatCard label="New requests" value={d.payouts.requestedCount} icon="🔔" />
        </div>
      </Section>

      <Section title="Top agents (by sales value)" to="/agents/leaderboard">
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {d.topAgents.length === 0 ? <p className="p-4 text-slate-400 text-sm">No data yet.</p> : d.topAgents.map((a, i) => (
            <div key={a.agentId} className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-6 font-bold text-slate-500">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
              <span className="flex-1 font-medium text-slate-800">{a.agentName}</span>
              <span className="text-sm text-slate-500">{a.bookings} bookings</span>
              <span className="text-sm font-semibold text-brand-primary w-28 text-right">{fmtMoney(a.dealValue)}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
