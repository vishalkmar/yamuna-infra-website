import React from 'react';
import { fmtDateTime } from '../lib/format';

const LABEL = { new: 'New', contacted: 'Contacted', site_visit: 'Site Visit', negotiation: 'Negotiation', booked: 'Booked', lost: 'Lost' };
const stageLabel = s => LABEL[s] || s || '—';

// Read-only stage-change timeline. `entries` from /leads/:id/history.
export default function LeadHistoryModal({ open, title = 'Lead timeline', entries, loading, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="bg-white h-full w-full max-w-md flex flex-col shadow-xl animate-[slideIn_.18s_ease]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <p className="text-slate-400 text-sm">Loading…</p>
          ) : !entries || entries.length === 0 ? (
            <p className="text-slate-400 text-sm">No stage changes yet.</p>
          ) : (
            <ol className="relative border-l border-slate-200 ml-2 space-y-4">
              {entries.map(e => (
                <li key={e.id} className="ml-4">
                  <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-brand-primary" />
                  <div className="text-sm text-slate-800">
                    <span className="font-medium">{stageLabel(e.fromStage)}</span> → <span className="font-medium">{stageLabel(e.toStage)}</span>
                  </div>
                  <div className="text-xs text-slate-400">{fmtDateTime(e.createdAt)} · {e.byName || e.byType}</div>
                  {e.note && <div className="text-xs text-slate-500 mt-0.5">“{e.note}”</div>}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
