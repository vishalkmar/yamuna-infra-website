// Live office activity over the API WebSocket (/ws?admin=<token>).
// One shared connection; components subscribe with onActivity(fn).
const listeners = new Set();
const typed = new Map(); // type -> Set<fn>
let ws = null;
let retry = 0;
let timer = null;
let connected = false;
const statusSubs = new Set();
function setConnected(v) { if (connected !== v) { connected = v; statusSubs.forEach(f => f(v)); } }
export const isConnected = () => connected;
export function onStatus(fn) { statusSubs.add(fn); fn(connected); return () => statusSubs.delete(fn); }
export function ensureLive() { if (!ws) { retry = 0; connect(); } }

function wsUrl(token) {
  const base = import.meta.env.VITE_API_BASE_URL || '/api';
  const abs = /^https?:/.test(base) ? base : `${window.location.origin}${base}`;
  return `${abs.replace(/\/api\/?$/, '').replace(/^http/, 'ws')}/ws?admin=${encodeURIComponent(token)}`;
}

function connect() {
  const token = localStorage.getItem('admin_token');
  if (!token || ws) return;
  try { ws = new WebSocket(wsUrl(token)); } catch (_) { ws = null; return; }
  ws.onopen = () => {
    retry = 0; setConnected(true);
    const sock = ws;
    const ping = setInterval(() => { if (sock.readyState === 1) { try { sock.send('ping'); } catch (_) { /* noop */ } } else clearInterval(ping); }, 30000);
  };
  ws.onmessage = e => {
    let msg; try { msg = JSON.parse(e.data); } catch (_) { return; }
    if (msg.type === 'activity' && msg.data) listeners.forEach(fn => fn(msg.data));
    (typed.get(msg.type) || new Set()).forEach(fn => fn(msg.data));
  };
  ws.onclose = () => {
    ws = null;
    setConnected(false);
    if ((!listeners.size && !typed.size) || !localStorage.getItem('admin_token')) return;
    retry = Math.min(retry + 1, 4);
    clearTimeout(timer);
    timer = setTimeout(connect, Math.min(15000, 1000 * 2 ** retry));
  };
  ws.onerror = () => {};
}

export function onActivity(fn) {
  listeners.add(fn);
  connect();
  return () => {
    listeners.delete(fn);
    if (!listeners.size && !typed.size && ws) { try { ws.close(); } catch (_) { /* noop */ } ws = null; }
  };
}

// Any socket message type (e.g. 'chat', 'chat_read', 'chat_delivered').
export function onSocket(type, fn) {
  if (!typed.has(type)) typed.set(type, new Set());
  typed.get(type).add(fn);
  connect();
  return () => { const set = typed.get(type); if (set) { set.delete(fn); if (!set.size) typed.delete(type); } };
}

// What each event is called in the portal.
export const EVENT_META = {
  account_created: { label: 'Account created', icon: '🏡', tone: 'violet' },
  payment_received: { label: 'Installment paid', icon: '✅', tone: 'green' },
  app_payment: { label: 'App payment', icon: '💳', tone: 'green' },
  due_reminder: { label: 'Due reminder', icon: '⏰', tone: 'amber' },
  payment_overdue: { label: 'Overdue notice', icon: '⚠️', tone: 'red' },
  docket_uploaded: { label: 'Docket shared', icon: '📄', tone: 'blue' },
  site_update: { label: 'Site update', icon: '🏗️', tone: 'slate' },
  construction_update: { label: 'Construction update', icon: '🧱', tone: 'slate' },
  admin_email: { label: 'Email from office', icon: '📧', tone: 'blue' },
  reminder_set: { label: 'Reminder set', icon: '⏰', tone: 'violet' },
};
export const eventMeta = e => EVENT_META[e] || { label: e, icon: '🔔', tone: 'slate' };
