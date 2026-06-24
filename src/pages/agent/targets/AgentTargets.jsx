import React, { useEffect, useState, useCallback } from 'react';
import agentApi, { apiError } from '../../../lib/agentApi';
import { useToast } from '../../../components/Toast';
import StatusBadge from '../../../components/StatusBadge';
import { fmtMoney, fmtDate } from '../../../lib/format';

function pct(a, t) { const x = Number(t) || 0; return x <= 0 ? 0 : Math.min(100, Math.round((Number(a) || 0) / x * 100)); }
const fmtMetric = (v, m) => m === 'bookings' ? `${Number(v) || 0}` : fmtMoney(v);

export default function AgentTargets() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await agentApi.get('/agent/targets'); setRows(data.data); }
    catch (e) { toast.error(apiError(e, 'Could not load targets')); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-3xl">
      <h2 className="text-lg font-bold text-slate-800 mb-1">Targets & Incentives</h2>
      <p className="text-sm text-slate-500 mb-4">Hit your targets to earn incentives.</p>

      {loading ? <div className="text-slate-400">Loading…</div>
        : rows.length === 0 ? <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">No targets assigned yet.</div>
        : (
          <div className="space-y-3">
            {rows.map(r => {
              const p = pct(r.achieved, r.targetValue);
              return (
                <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800">{r.title}</div>
                      <div className="text-xs text-slate-400">{fmtDate(r.periodStart)} – {fmtDate(r.periodEnd)}</div>
                    </div>
                    <div className="text-right">
                      {r.incentiveAmount > 0 && <div className="text-sm text-brand-primary font-semibold">{fmtMoney(r.incentiveAmount)} bonus</div>}
                      <StatusBadge status={r.status === 'awarded' ? 'approved' : p >= 100 ? 'approved' : 'pending'}>{r.status === 'awarded' ? 'awarded' : p >= 100 ? 'achieved' : 'in progress'}</StatusBadge>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1"><span>{fmtMetric(r.achieved, r.metric)} / {fmtMetric(r.targetValue, r.metric)}</span><span>{p}%</span></div>
                    <div className="h-2.5 rounded bg-slate-100 overflow-hidden"><div className={`h-full ${p >= 100 ? 'bg-emerald-500' : 'bg-brand-primary'}`} style={{ width: `${p}%` }} /></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}
