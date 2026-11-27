import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { onActivity, eventMeta } from '../lib/live';
import { fmtDateTime } from '../lib/format';
import { inr } from '../lib/dash';

// Header bell: live feed of what residents did / were sent (payments,
// dockets, reminders…). Unread = newer than the last time the menu was opened.
const SEEN = 'comms_seen_at';

export default function LiveBell() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [seenAt, setSeenAt] = useState(() => localStorage.getItem(SEEN) || '');

  useEffect(() => {
    api.get('/admin/comms', { params: { pageSize: 12 } }).then(r => setItems(r.data.data.rows)).catch(() => {});
    return onActivity(r => {
      setItems(prev => [r, ...prev.filter(x => x.id !== r.id)].slice(0, 12));
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
        try { new Notification(`${eventMeta(r.event).icon} ${r.title}`, { body: `${r.userName || 'All residents'} — ${r.body || ''}` }); } catch (_) { /* noop */ }
      }
    });
  }, []);

  const ts = d => new Date(String(d).replace(' ', 'T')).getTime() || 0;
  const unread = items.filter(i => !seenAt || ts(i.createdAt) > Number(seenAt)).length;
  const toggle = () => {
    if (!open) {
      const now = String(Date.now());
      localStorage.setItem(SEEN, now);
      setTimeout(() => setSeenAt(now), 400);
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
    }
    setOpen(o => !o);
  };

  return (
    <div className="relative">
      <button onClick={toggle} className="relative w-9 h-9 rounded-full hover:bg-slate-100 grid place-items-center text-lg" title="Live activity">
        🔔
        {unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold grid place-items-center">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-[380px] bg-white rounded-xl shadow-lg border border-slate-200 z-20">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
              <span className="font-semibold text-slate-700 text-sm">Live activity</span>
              <span className="flex items-center gap-1 text-[11px] text-slate-400"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> live</span>
            </div>
            <ul className="max-h-[420px] overflow-y-auto divide-y divide-slate-50">
              {items.length === 0 && <li className="px-4 py-6 text-sm text-slate-400 text-center">Nothing yet</li>}
              {items.map(i => {
                const m = eventMeta(i.event);
                return (
                  <li key={i.id}>
                    <button onClick={() => { setOpen(false); navigate(i.userId ? `/users/${i.userId}?tab=comms` : '/communications'); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex gap-3">
                      <span className="text-lg">{m.icon}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-slate-800 truncate">{i.title}</span>
                        <span className="block text-xs text-slate-500 truncate">{i.userName || 'All residents'}{i.amount != null ? ` · ${inr(i.amount)}` : ''}</span>
                        <span className="block text-[11px] text-slate-400">{fmtDateTime(i.createdAt)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <button onClick={() => { setOpen(false); navigate('/communications'); }} className="w-full px-4 py-2.5 text-sm font-semibold text-brand-primary border-t border-slate-100 hover:bg-slate-50">
              Open communications log →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
