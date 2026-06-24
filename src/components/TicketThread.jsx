import React, { useState } from 'react';
import { inputClass } from './FormModal';
import StatusBadge from './StatusBadge';
import { fmtDateTime } from '../lib/format';

// Threaded ticket drawer. Parent supplies ticket + messages + handlers.
//   onSend(body) · statusBar (optional ReactNode, e.g. admin status buttons)
export default function TicketThread({ open, ticket, messages, loading, onClose, onSend, statusBar }) {
  const [body, setBody] = useState('');
  if (!open) return null;

  function send(e) {
    e.preventDefault();
    if (!body.trim()) return;
    onSend(body);
    setBody('');
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="bg-white h-full w-full max-w-lg flex flex-col shadow-xl animate-[slideIn_.18s_ease]" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 truncate">{ticket?.subject}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg">✕</button>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={ticket?.status === 'resolved' || ticket?.status === 'closed' ? 'approved' : ticket?.status === 'open' ? 'pending' : 'preparing'}>{ticket?.status?.replace('_', ' ')}</StatusBadge>
            {ticket?.agentName && <span className="text-xs text-slate-400">{ticket.agentName}</span>}
            {ticket?.category && <span className="text-xs text-slate-400">· {ticket.category}</span>}
          </div>
          {statusBar && <div className="mt-2">{statusBar}</div>}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? <p className="text-slate-400 text-sm">Loading…</p>
            : (messages || []).map(m => (
              <div key={m.id} className={`max-w-[85%] ${m.senderType === 'admin' ? 'ml-auto text-right' : ''}`}>
                <div className={`inline-block rounded-xl px-3 py-2 text-sm ${m.senderType === 'admin' ? 'bg-brand-primary text-white' : 'bg-slate-100 text-slate-800'}`}>
                  <p className="whitespace-pre-wrap text-left">{m.body}</p>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{m.senderName || (m.senderType === 'admin' ? 'Support' : 'You')} · {fmtDateTime(m.createdAt)}</div>
              </div>
            ))}
        </div>

        <form onSubmit={send} className="p-4 border-t border-slate-200 flex gap-2">
          <input className={inputClass} placeholder="Type a reply…" value={body} onChange={e => setBody(e.target.value)} />
          <button type="submit" className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90 shrink-0">Send</button>
        </form>
      </div>
    </div>
  );
}
