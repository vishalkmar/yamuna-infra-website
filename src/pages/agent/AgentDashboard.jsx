import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAgentAuth } from '../../context/AgentAuthContext';
import agentApi, { apiError } from '../../lib/agentApi';
import { useToast } from '../../components/Toast';
import StatCard from '../../components/StatCard';
import { fmtMoney } from '../../lib/format';

// Agent self dashboard (Module 1.7) — real KPIs from GET /api/agent/dashboard.
export default function AgentDashboard() {
  const { agent } = useAgentAuth();
  const toast = useToast();
  const [d, setD] = useState(null);

  useEffect(() => {
    (async () => {
      try { const { data } = await agentApi.get('/agent/dashboard'); setD(data.data); }
      catch (e) { toast.error(apiError(e, 'Could not load dashboard')); }
    })();
  }, [toast]);

  const c = d?.counts;
  const e = d?.earnings;

  return (
    <div className="space-y-6">
      {agent?.kycStatus !== 'approved' && (
        <Link to="/agent/kyc" className="block bg-amber-50 border border-amber-200 rounded-xl p-4 hover:bg-amber-100/70 transition">
          <span className="font-semibold text-amber-800">🪪 Complete your KYC</span>
          <span className="text-amber-700 text-sm">
            {agent?.kycStatus === 'pending' ? ' — documents under review.' : agent?.kycStatus === 'rejected' ? ' — rejected, please re-upload.' : ' — upload your documents to get verified.'}
          </span>
        </Link>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-primary/10 text-brand-primary grid place-items-center text-2xl font-extrabold">
            {(agent?.name || 'A').charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Welcome, {agent?.name} 👋</h2>
            <p className="text-sm text-slate-500">
              {agent?.tierName ? `${agent.tierName} partner` : 'Channel partner'}
              {agent?.companyName ? ` · ${agent.companyName}` : ''}
              {agent?.referralCode ? ` · Ref: ${agent.referralCode}` : ''}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide bg-emerald-100 text-emerald-700 px-2 py-1 rounded">{agent?.status}</span>
            <span className="text-[11px] uppercase tracking-wide bg-slate-100 text-slate-600 px-2 py-1 rounded">KYC: {agent?.kycStatus}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/agent/leads"><StatCard label="My Leads" value={c ? c.leads : '—'} icon="📇" hint={c ? `${c.openLeads} open` : ''} /></Link>
        <Link to="/agent/visits"><StatCard label="Site Visits" value={c ? c.visits : '—'} icon="📅" hint={c ? `${c.upcomingVisits} upcoming` : ''} /></Link>
        <Link to="/agent/bookings"><StatCard label="Bookings" value={c ? c.bookings : '—'} icon="🧾" hint={c ? `${c.approvedBookings} approved` : ''} /></Link>
        <Link to="/agent/earnings"><StatCard label="Approved earnings" value={e ? fmtMoney(e.approved) : '—'} icon="💰" hint={e ? `${fmtMoney(e.lifetime)} lifetime` : ''} /></Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Accrued (pending approval)" value={e ? fmtMoney(e.accrued) : '—'} icon="⏳" />
        <StatCard label="Paid out" value={e ? fmtMoney(e.paid) : '—'} icon="🏦" />
        <Link to="/agent/inventory"><StatCard label="Browse inventory" value="→" icon="🏢" hint="Pitch live units" /></Link>
        <Link to="/agent/leaderboard"><StatCard label="Leaderboard" value="🏆" icon="📊" hint="See your rank" /></Link>
      </div>
    </div>
  );
}
