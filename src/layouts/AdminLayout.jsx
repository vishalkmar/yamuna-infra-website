import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import api, { apiError } from '../lib/api';
import FormModal, { Field, inputClass } from '../components/FormModal';
import SosAlertWatcher from '../components/SosAlertWatcher';

// Sidebar nav — mirrors ADMIN_PORTAL_DOCUMENTATION.pdf. `roles` (optional)
// restricts visibility; absent = visible to all admin roles.
export const MODULES = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/users', label: 'Users & Residents', icon: '👥' },
  { path: '/agents/dashboard', label: 'AMS Overview', icon: '📊' },
  { path: '/agents', label: 'Agents (CRM)', icon: '🤝' },
  { path: '/agents/inventory', label: 'Inventory', icon: '🏢' },
  { path: '/agents/leads', label: 'Leads / CRM', icon: '📇' },
  { path: '/agents/pipeline', label: 'Pipeline', icon: '📊' },
  { path: '/agents/visits', label: 'Site Visits', icon: '📅' },
  { path: '/agents/bookings', label: 'Agent Bookings', icon: '🧾' },
  { path: '/agents/commission', label: 'Commission', icon: '💰', roles: ['superadmin', 'manager'] },
  { path: '/agents/payouts', label: 'Payouts', icon: '🏦', roles: ['superadmin', 'manager'] },
  { path: '/agents/targets', label: 'Targets', icon: '🎯', roles: ['superadmin', 'manager'] },
  { path: '/agents/leaderboard', label: 'Leaderboard', icon: '🏆' },
  { path: '/agents/analytics', label: 'Agent Analytics', icon: '📈', roles: ['superadmin', 'manager'] },
  { path: '/agents/notify', label: 'Agent Broadcasts', icon: '📣' },
  { path: '/agents/collateral', label: 'Collateral', icon: '📁' },
  { path: '/agents/training', label: 'Training', icon: '🎓' },
  { path: '/agents/news', label: 'Agent News', icon: '📰' },
  { path: '/agents/support', label: 'Agent Support', icon: '🎫' },
  { path: '/agents/templates', label: 'Msg Templates', icon: '💬' },
  { path: '/agents/bi', label: 'BI Dashboard', icon: '📉', roles: ['superadmin', 'manager'] },
  { path: '/agents/settings', label: 'AMS Settings', icon: '⚙️', roles: ['superadmin', 'manager'] },
  { path: '/construction', label: 'Construction System', icon: '🏗️' },
  { path: '/payment-plan', label: 'Payments & Plan', icon: '💳' },
  { path: '/sos', label: 'SOS & Emergency', icon: '🆘' },
  { path: '/dockets', label: 'Booking Dockets', icon: '📘' },
  { path: '/site', label: 'Site Overview', icon: '🗺️' },
  { path: '/services', label: 'Services & Providers', icon: '🛎️' },
  { path: '/food', label: 'Food Ordering', icon: '🍽️' },
  { path: '/healthcare', label: 'Doctors & Healthcare', icon: '🩺' },
  { path: '/mobility', label: 'Mobility Aids', icon: '🦽' },
  { path: '/wellness', label: 'Wellness & Spiritual', icon: '🧘' },
  { path: '/temples', label: 'Temple Directory', icon: '🛕' },
  { path: '/transport', label: 'Transport (Cabs)', icon: '🚕' },
  { path: '/amenities', label: 'Amenities & Clubhouse', icon: '🎯' },
  { path: '/community', label: 'Community & Visitors', icon: '📢' },
  { path: '/rewards', label: 'Rewards & Projects', icon: '🎁' },
  { path: '/notifications', label: 'Notifications', icon: '🔔' },
  { path: '/ai', label: 'AI Concierge (RAG)', icon: '🤖' },
  { path: '/media', label: 'Media Library', icon: '🖼️' },
  { path: '/settings', label: 'App Settings', icon: '⚙️' },
  { path: '/audit', label: 'Audit & Admins', icon: '🛡️', roles: ['superadmin'] },
];

function Sidebar({ role }) {
  const items = MODULES.filter(m => !m.roles || m.roles.includes(role));
  return (
    <aside className="w-64 shrink-0 bg-brand-dark text-slate-200 h-screen sticky top-0 overflow-y-auto">
      <div className="px-5 py-5 border-b border-white/10 flex items-center gap-3">
        <img src="/logo.png" alt="" className="w-10 h-10 rounded-lg object-contain bg-white/90 p-0.5" onError={e => { e.currentTarget.style.display = 'none'; }} />
        <div>
          <div className="text-lg font-extrabold text-white leading-tight">Shri Yamuna Infra</div>
          <div className="text-xs text-slate-400">Admin Portal</div>
        </div>
      </div>
      <nav className="p-2">
        {items.map(m => (
          <NavLink
            key={m.path}
            to={m.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 transition ${
                isActive ? 'bg-brand-primary text-white font-semibold' : 'hover:bg-white/5'
              }`
            }
          >
            <span>{m.icon}</span>
            <span>{m.label}</span>
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
      await api.post('/admin/auth/change-password', { currentPassword, newPassword });
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

function Topbar({ admin, onLogout }) {
  const [menu, setMenu] = useState(false);
  const [pwd, setPwd] = useState(false);
  const initial = (admin?.name || admin?.email || 'A').charAt(0).toUpperCase();
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-20">
      <h1 className="font-bold text-slate-700">Admin Portal</h1>
      <div className="relative">
        <button onClick={() => setMenu(v => !v)} className="flex items-center gap-2 text-sm">
          <span className="text-slate-600 hidden sm:block">{admin?.name}</span>
          <span className="text-[11px] uppercase tracking-wide bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded hidden sm:block">{admin?.role}</span>
          <span className="w-8 h-8 rounded-full bg-brand-primary text-white grid place-items-center font-semibold">{initial}</span>
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20 text-sm">
              <div className="px-4 py-2 border-b border-slate-100">
                <div className="font-semibold text-slate-700 truncate">{admin?.name}</div>
                <div className="text-slate-400 truncate">{admin?.email}</div>
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

export default function AdminLayout() {
  const { admin, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  function onLogout() {
    logout();
    toast.info('Logged out');
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role={admin?.role} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar admin={admin} onLogout={onLogout} />
        <main className="p-6 flex-1">
          <Outlet />
        </main>
      </div>
      {/* Reception SOS watcher — shows a blinking danger popup on any page. */}
      <SosAlertWatcher />
    </div>
  );
}
