import React, { useEffect, useState } from 'react';
import api, { apiError } from '../../../lib/api';
import { useToast } from '../../../components/Toast';
import PageHeader from '../../../components/PageHeader';
import StatCard from '../../../components/StatCard';
import { fmtMoney } from '../../../lib/format';

const STATUS_COLORS = { available: 'bg-emerald-500', held: 'bg-amber-500', blocked: 'bg-slate-400', booked: 'bg-blue-500', sold: 'bg-brand-primary' };

export default function Bi() {
  const toast = useToast();
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const { data } = await api.get('/admin/ams-bi', { params: { months: 6 } }); setD(data.data); }
      catch (e) { toast.error(apiError(e, 'Could not load BI')); } finally { setLoading(false); }
    })();
  }, [toast]);

  async function exportCsv() {
    try {
      const res = await api.get('/admin/ams-bi/export.csv', { params: { months: 12 }, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a'); a.href = url; a.download = 'ams-monthly-report.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error(apiError(e, 'Export failed')); }
  }

  if (loading) return <div className="text-slate-400">Loading…</div>;
  if (!d) return null;

  const maxDeal = Math.max(1, ...d.trend.map(t => t.dealValue));
  const inv = d.inventory.health;
  const invTotal = Object.values(inv).reduce((s, n) => s + n, 0) || 1;

  return (
    <div>
      <PageHeader title="Business Intelligence" subtitle="Sales trend, commission & inventory health">
        <button onClick={exportCsv} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50">Export 12-month CSV</button>
      </PageHeader>

      {/* Sales trend */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
        <h3 className="font-semibold text-slate-700 mb-4">Sales value — last 6 months</h3>
        <div className="flex items-end gap-3 h-48">
          {d.trend.map(t => (
            <div key={t.ym} className="flex-1 flex flex-col items-center justify-end h-full">
              <div className="text-xs text-slate-500 mb-1">{t.dealValue ? fmtMoney(t.dealValue) : ''}</div>
              <div className="w-full bg-brand-primary rounded-t" style={{ height: `${(t.dealValue / maxDeal) * 100}%`, minHeight: t.dealValue ? '4px' : '0' }} />
              <div className="text-xs text-slate-400 mt-1">{t.ym.slice(5)}</div>
              <div className="text-[11px] text-slate-400">{t.bookings} bk</div>
            </div>
          ))}
        </div>
      </div>

      {/* Commission trend cards */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        {d.trend.map(t => <StatCard key={t.ym} label={t.ym.slice(5) + '/' + t.ym.slice(2, 4)} value={fmtMoney(t.commission)} hint="commission" />)}
      </div>

      {/* Inventory health */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
        <h3 className="font-semibold text-slate-700 mb-3">Inventory health</h3>
        <div className="flex h-5 rounded overflow-hidden mb-3">
          {Object.entries(inv).map(([k, v]) => v > 0 && <div key={k} className={STATUS_COLORS[k]} style={{ width: `${(v / invTotal) * 100}%` }} title={`${k}: ${v}`} />)}
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          {Object.entries(inv).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5"><span className={`w-3 h-3 rounded ${STATUS_COLORS[k]}`} /><span className="capitalize text-slate-600">{k}</span><b>{v}</b></span>
          ))}
        </div>
      </div>

      {/* Per project */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-700 mb-3">Projects</h3>
        {d.inventory.projects.length === 0 ? <p className="text-slate-400 text-sm">No projects yet.</p> : (
          <div className="space-y-2">
            {d.inventory.projects.map((p, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="flex-1 font-medium text-slate-700">{p.name}</span>
                <span className="text-emerald-600">{p.available} avail</span>
                <span className="text-brand-primary">{p.sold} sold</span>
                <span className="text-slate-400">/ {p.total}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
