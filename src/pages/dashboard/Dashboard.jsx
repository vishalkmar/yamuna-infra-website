import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import StatCard from '../../components/StatCard';
import { fmtMoney, fmtDateTime } from '../../lib/format';

const RANGES = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
];

const KIND_ICON = { signup: '👤', food: '🍽️', ride: '🚕', service: '🛎️', appointment: '🩺', sos: '🆘' };

function MiniChart({ data }) {
  if (!data.length) return <div className="text-sm text-slate-400">No order data in this range.</div>;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map(d => (
        <div key={d.date} className="flex-1 flex flex-col items-center justify-end" title={`${d.date}: ${d.count}`}>
          <div className="w-full bg-brand-primary/80 rounded-t" style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count ? 4 : 0 }} />
          <span className="text-[9px] text-slate-400 mt-1">{String(d.date).slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const [range, setRange] = useState('7d');
  const [stats, setStats] = useState(null);
  const [series, setSeries] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, t, a] = await Promise.all([
        api.get('/admin/stats/overview', { params: { range } }),
        api.get('/admin/stats/timeseries', { params: { range } }),
        api.get('/admin/stats/activity'),
      ]);
      setStats(o.data.data); setSeries(t.data.data); setActivity(a.data.data);
    } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [range, toast]);

  useEffect(() => { load(); }, [load]);

  const cards = stats ? [
    { label: 'Residents', value: stats.residents, icon: '👥', hint: `${stats.activeResidents} active`, to: '/users' },
    { label: 'New signups', value: stats.newResidents, icon: '✨', hint: 'in range' },
    { label: 'KYC pending', value: stats.kycPending, icon: '🪪', to: '/users' },
    { label: 'Active providers', value: stats.providers, icon: '🛎️', to: '/services' },
    { label: 'Doctors', value: stats.doctors, icon: '🩺', to: '/healthcare' },
    { label: 'Food orders', value: stats.ordersInRange, icon: '🍽️', hint: 'in range', to: '/food/orders' },
    { label: 'Rides', value: stats.ridesInRange, icon: '🚕', hint: 'in range', to: '/transport/rides' },
    { label: 'Open SOS', value: stats.openSos, icon: '🆘' },
    { label: 'Revenue', value: fmtMoney(stats.revenue), icon: '💰', hint: 'food + rides, in range' },
  ] : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Dashboard</h2>
          <p className="text-slate-500 text-sm">Platform at a glance</p>
        </div>
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button key={r.key} onClick={() => setRange(r.key)} className={`px-3 py-1.5 rounded-lg text-sm border transition ${range === r.key ? 'bg-brand-primary text-white border-brand-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !stats ? (
        <div className="text-slate-400">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
            {cards.map(c => (
              <div key={c.label} onClick={() => c.to && navigate(c.to)} className={c.to ? 'cursor-pointer' : ''}>
                <StatCard label={c.label} value={c.value} icon={c.icon} hint={c.hint} />
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-bold text-slate-800 mb-3">Food orders trend</h3>
              <MiniChart data={series} />
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-bold text-slate-800 mb-3">Recent activity</h3>
              {activity.length === 0 ? (
                <p className="text-sm text-slate-400">No recent activity.</p>
              ) : (
                <ul className="divide-y divide-slate-50">
                  {activity.map(a => (
                    <li key={`${a.kind}-${a.refId}`} className="py-2 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span>{KIND_ICON[a.kind] || '•'}</span>
                        <span className="text-slate-700">{a.label}</span>
                        {a.status && <span className="text-xs text-slate-400 capitalize">· {a.status}</span>}
                      </div>
                      <span className="text-xs text-slate-400">{fmtDateTime(a.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
