import React from 'react';
import { fmtMoney } from '../lib/format';

// Kanban funnel board. Presentational — parent supplies leads + handlers.
//   leads: [{ id, name, phone, projectName, budget, stage, agentName? }]
//   onMove(lead, toStage) · onOpenHistory(lead)
export const STAGES = [
  { value: 'new', label: 'New', head: 'bg-slate-100 text-slate-700' },
  { value: 'contacted', label: 'Contacted', head: 'bg-sky-100 text-sky-700' },
  { value: 'site_visit', label: 'Site Visit', head: 'bg-indigo-100 text-indigo-700' },
  { value: 'negotiation', label: 'Negotiation', head: 'bg-amber-100 text-amber-700' },
  { value: 'booked', label: 'Booked', head: 'bg-emerald-100 text-emerald-700' },
  { value: 'lost', label: 'Lost', head: 'bg-rose-100 text-rose-700' },
];

export default function PipelineBoard({ leads, onMove, onOpenHistory, showAgent = false, loading }) {
  if (loading) return <div className="text-slate-400">Loading…</div>;
  const grouped = STAGES.reduce((acc, s) => { acc[s.value] = []; return acc; }, {});
  leads.forEach(l => { (grouped[l.stage] || (grouped[l.stage] = [])).push(l); });

  return (
    <div className="flex gap-3 overflow-x-auto pb-3">
      {STAGES.map(s => (
        <div key={s.value} className="w-64 shrink-0">
          <div className={`rounded-t-lg px-3 py-2 text-sm font-semibold flex items-center justify-between ${s.head}`}>
            <span>{s.label}</span>
            <span className="text-xs opacity-70">{grouped[s.value].length}</span>
          </div>
          <div className="bg-slate-50 rounded-b-lg p-2 space-y-2 min-h-[120px]">
            {grouped[s.value].length === 0 && <p className="text-xs text-slate-400 text-center py-4">—</p>}
            {grouped[s.value].map(l => (
              <div key={l.id} className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
                <div className="font-medium text-slate-800 text-sm">{l.name}</div>
                <div className="text-xs text-slate-400">{l.phone || l.email || ''}</div>
                {l.projectName && <div className="text-xs text-slate-500 mt-1">🏢 {l.projectName}{l.unitNo ? ` · ${l.unitNo}` : ''}</div>}
                {showAgent && l.agentName && <div className="text-xs text-slate-500">🤝 {l.agentName}</div>}
                {l.budget ? <div className="text-xs text-brand-primary font-semibold mt-0.5">{fmtMoney(l.budget)}</div> : null}
                <div className="flex items-center gap-2 mt-2">
                  <select
                    value={l.stage}
                    onChange={e => onMove(l, e.target.value)}
                    className="text-xs border border-slate-300 rounded px-1.5 py-1 flex-1"
                  >
                    {STAGES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <button onClick={() => onOpenHistory(l)} className="text-xs text-slate-500 hover:text-brand-primary" title="History">🕑</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
