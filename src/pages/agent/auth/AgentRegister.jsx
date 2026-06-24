import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAgentAuth } from '../../../context/AgentAuthContext';
import { useToast } from '../../../components/Toast';
import agentApi, { apiError } from '../../../lib/agentApi';

const inputCls = 'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary';

const AGENT_TYPES = [
  { value: 'channel_partner', label: 'Channel Partner' },
  { value: 'broker', label: 'Broker' },
  { value: 'freelancer', label: 'Freelancer' },
];

export default function AgentRegister() {
  const { agent } = useAgentAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirm: '',
    agentType: 'channel_partner', companyName: '', city: '', state: '',
  });
  const [busy, setBusy] = useState(false);

  if (agent) return <Navigate to="/agent" replace />;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function onSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return; }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setBusy(true);
    try {
      const { confirm, ...payload } = form;
      await agentApi.post('/agent/auth/register', payload);
      toast.success('Application submitted — pending admin approval');
      navigate('/agent/login', { replace: true });
    } catch (err) {
      toast.error(apiError(err, 'Registration failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-7">
        <div className="text-center mb-6">
          <div className="text-3xl">🤝</div>
          <h1 className="text-xl font-extrabold text-slate-800 mt-1">Become a Partner</h1>
          <p className="text-sm text-slate-500">Apply to join Shri Yamuna Infra's channel network</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block col-span-2">
              <span className="block text-sm font-medium text-slate-700 mb-1">Full name *</span>
              <input value={form.name} onChange={e => set('name', e.target.value)} required autoFocus className={inputCls} />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">Email *</span>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required className={inputCls} />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">Phone</span>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">Partner type</span>
              <select value={form.agentType} onChange={e => set('agentType', e.target.value)} className={inputCls}>
                {AGENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">Company</span>
              <input value={form.companyName} onChange={e => set('companyName', e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">City</span>
              <input value={form.city} onChange={e => set('city', e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">State</span>
              <input value={form.state} onChange={e => set('state', e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">Password *</span>
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)} required className={inputCls} />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">Confirm *</span>
              <input type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)} required className={inputCls} />
            </label>
          </div>
          <button type="submit" disabled={busy} className="w-full bg-brand-primary text-white font-semibold py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition mt-2">
            {busy ? 'Submitting…' : 'Submit application'}
          </button>
        </form>
        <p className="text-center text-sm text-slate-500 mt-5">
          Already a partner?{' '}
          <Link to="/agent/login" className="text-brand-primary font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
