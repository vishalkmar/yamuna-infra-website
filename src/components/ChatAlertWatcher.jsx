import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { onSocket } from '../lib/live';

// Portal-wide: a resident's new chat message pops a toast + browser
// notification (unless that chat is open) and keeps the sidebar badge fresh.
let unread = 0;
const subs = new Set();
const setUnread = n => { unread = Math.max(0, n); subs.forEach(f => f(unread)); };

export function useChatUnread() {
  const [n, setN] = useState(unread);
  useEffect(() => { subs.add(setN); return () => subs.delete(setN); }, []);
  return n;
}

export default function ChatAlertWatcher() {
  const location = useLocation();
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const refresh = () => api.get('/admin/support/unread').then(r => setUnread(r.data.data.messages)).catch(() => {});
    refresh();
    const t = setInterval(refresh, 60000);
    const offChat = onSocket('chat', m => {
      if (m.sender !== 'user') return;
      const params = new URLSearchParams(window.location.search);
      const viewing = window.location.pathname === '/support-chat' && Number(params.get('user')) === m.userId && document.visibilityState === 'visible';
      if (viewing) return;
      setUnread(unread + 1);
      const preview = m.body || '📎 Attachment';
      setToast({ userId: m.userId, name: m.userName || m.userMobile || 'Resident', preview });
      setTimeout(() => setToast(cur => (cur && cur.userId === m.userId ? null : cur)), 7000);
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          const n = new Notification(`💬 ${m.userName || 'Resident'}`, { body: preview, tag: `chat-${m.userId}` });
          n.onclick = () => { window.focus(); navigate(`/support-chat?user=${m.userId}`); };
        } catch (_) { /* noop */ }
      }
    });
    const offRead = onSocket('chat_read', e => { if (e.reader === 'admin') refresh(); });
    return () => { clearInterval(t); offChat(); offRead(); };
  }, [navigate]);

  if (!toast || location.pathname === '/support-chat') return null;
  return (
    <button onClick={() => { setToast(null); navigate(`/support-chat?user=${toast.userId}`); }}
      className="fixed bottom-5 right-5 z-50 w-80 text-left bg-white border border-emerald-200 shadow-xl rounded-xl p-3 flex gap-3 animate-[slideIn_.18s_ease]">
      <span className="text-2xl">💬</span>
      <span className="min-w-0">
        <span className="block font-semibold text-slate-800 truncate">{toast.name}</span>
        <span className="block text-sm text-slate-600 truncate">{toast.preview}</span>
        <span className="block text-xs text-emerald-600 font-semibold mt-0.5">Open chat →</span>
      </span>
    </button>
  );
}
