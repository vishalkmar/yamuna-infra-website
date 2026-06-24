import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAgentAuth } from '../context/AgentAuthContext';
import { useToast } from '../components/Toast';
import agentApi, { apiError } from '../lib/agentApi';
import FormModal, { Field, inputClass } from '../components/FormModal';

// Agent portal nav. Only Dashboard is built (Module 1.1); the rest are added as
// later AMS modules land.
export const AGENT_MODULES = [
  { path: '/agent', label: 'Dashboard', icon: '📊', end: true },
  { path: '/agent/kyc', label: 'KYC', icon: '🪪' },
  { path: '/agent/leads', label: 'My Leads', icon: '📇' },
  { path: '/agent/pipeline', label: 'Pipeline', icon: '📊' },
  { path: '/agent/tasks', label: 'Follow-ups', icon: '✅' },
  { path: '/agent/inventory', label: 'Inventory', icon: '🏢' },
  { path: '/agent/visits', label: 'Site Visits', icon: '📅' },
  { path: '/agent/bookings', label: 'My Bookings', icon: '🧾' },
  { path: '/agent/earnings', label: 'Earnings', icon: '💰' },
  { path: '/agent/payouts', label: 'Payouts', icon: '🏦' },
  { path: '/agent/targets', label: 'Targets', icon: '🎯' },
  { path: '/agent/leaderboard', label: 'Leaderboard', icon: '🏆' },
  { path: '/agent/notifications', label: 'Notifications', icon: '🔔' },
  { path: '/agent/collateral', label: 'Collateral', icon: '📁' },
  { path: '/agent/training', label: 'Training', icon: '🎓' },
  { path: '/agent/news', label: 'News', icon: '📰' },
  { path: '/agent/support', label: 'Support', icon: '🎫' },
  { path: '/agent/ai', label: 'Sales Assistant', icon: '🤖' },
  { path: '/agent/bank', label: 'Bank & Payout', icon: '🏦' },
];

function Sidebar() {
  return (
    <aside className="w-64 shrink-0 bg-brand-dark text-slate-200 h-screen sticky top-0 overflow-y-auto">
      <div className="px-5 py-5 border-b border-white/10 flex items-center gap-3">
        <img src="/logo.png" alt="" className="w-10 h-10 rounded-lg object-contain bg-white/90 p-0.5" onError={e => { e.currentTarget.style.display = 'none'; }} />
        <div>
          <div className="text-lg font-extrabold text-white leading-tight">Shri Yamuna Infra</div>
          <div className="text-xs text-slate-400">Channel Partner Portal</div>
        </div>
      </div>
      <nav className="p-2">
        {AGENT_MODULES.map(m => (
          <NavLink
            key={m.path}
            to={m.path}
            end={m.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 transition ${
                isActive ? 'bg-brand-primary text-white font-semibold' : 'hover:bg-white/5'
              }`
            }
          >
            <span>{m.icon}</span>
            <span>{m.label}</span>
            {m.soon && <span className="ml-auto text-[10px] uppercase tracking-wide bg-white/10 px-1.5 py-0.5 rounded">soon</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

function ChangePasswordModal({ open, onClose }) {
  const toast = useToast();
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (newPassword !== confirm) { toast.error('New passwords do not match'); return; }
    if (newPassword.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    setBusy(true);
    try {
      await agentApi.post('/agent/auth/change-password', { currentPassword, newPassword });
      toast.success('Password changed');
      setCurrent(''); setNew(''); setConfirm('');
      onClose();
    } catch (e) {
      toast.error(apiError(e, 'Could not change password'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormModal open={open} title="Change password" onClose={onClose} onSubmit={submit} submitting={busy} submitLabel="Update password">
      <Field label="Current password" required>
        <input type="password" className={inputClass} value={currentPassword} onChange={e => setCurrent(e.target.value)} />
      </Field>
      <Field label="New password" hint="At least 8 characters" required>
        <input type="password" className={inputClass} value={newPassword} onChange={e => setNew(e.target.value)} />
      </Field>
      <Field label="Confirm new password" required>
        <input type="password" className={inputClass} value={confirm} onChange={e => setConfirm(e.target.value)} />
      </Field>
    </FormModal>
  );
}

function Topbar({ agent, onLogout }) {
  const [menu, setMenu] = useState(false);
  const [pwd, setPwd] = useState(false);
  const initial = (agent?.name || agent?.email || 'A').charAt(0).toUpperCase();
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-20">
      <h1 className="font-bold text-slate-700">Partner Portal</h1>
      <div className="relative">
        <button onClick={() => setMenu(v => !v)} className="flex items-center gap-2 text-sm">
          <span className="text-slate-600 hidden sm:block">{agent?.name}</span>
          {agent?.tierName && <span className="text-[11px] uppercase tracking-wide bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded hidden sm:block">{agent.tierName}</span>}
          <span className="w-8 h-8 rounded-full bg-brand-primary text-white grid place-items-center font-semibold">{initial}</span>
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20 text-sm">
              <div className="px-4 py-2 border-b border-slate-100">
                <div className="font-semibold text-slate-700 truncate">{agent?.name}</div>
                <div className="text-slate-400 truncate">{agent?.email}</div>
              </div>
              <button onClick={() => { setMenu(false); setPwd(true); }} className="w-full text-left px-4 py-2 hover:bg-slate-50">🔑 Change password</button>
              <button onClick={onLogout} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-rose-600">↩ Logout</button>
            </div>
          </>
        )}
      </div>
      <ChangePasswordModal open={pwd} onClose={() => setPwd(false)} />
    </header>
  );
}

export default function AgentLayout() {
  const { agent, logout } = useAgentAuth();
  const toast = useToast();
  const navigate = useNavigate();

  function onLogout() {
    logout();
    toast.info('Logged out');
    navigate('/agent/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar agent={agent} onLogout={onLogout} />
        <main className="p-6 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
