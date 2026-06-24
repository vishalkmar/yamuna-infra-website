import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import { useAgentAuth } from '../../../context/AgentAuthContext';
import { useToast } from '../../../components/Toast';
import { apiError } from '../../../lib/agentApi';

const inputCls = 'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary';

export default function AgentLogin() {
  const { agent, login } = useAgentAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (agent) return <Navigate to={location.state?.from || '/agent'} replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email.trim(), password);
      toast.success('Welcome back!');
      navigate(location.state?.from || '/agent', { replace: true });
    } catch (err) {
      toast.error(apiError(err, 'Login failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-100 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-7">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="" className="h-16 mx-auto object-contain" onError={e => { e.currentTarget.outerHTML = '<div class=\'text-3xl\'>🤝</div>'; }} />
          <h1 className="text-xl font-extrabold text-slate-800 mt-2">Shri Yamuna Infra</h1>
          <p className="text-sm text-slate-500">Channel Partner Portal — sign in</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1">Email</span>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus className={inputCls} placeholder="agent@yamunainfra.com" />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1">Password</span>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className={inputCls} placeholder="••••••••" />
          </label>
          <button type="submit" disabled={busy} className="w-full bg-brand-primary text-white font-semibold py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="text-center text-sm text-slate-500 mt-5">
          New partner?{' '}
          <Link to="/agent/register" className="text-brand-primary font-semibold hover:underline">Apply to join</Link>
        </p>
      </div>
    </div>
  );
}
