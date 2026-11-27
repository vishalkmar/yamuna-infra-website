import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { onSocket, onStatus, isConnected, ensureLive } from '../../lib/live';

// WhatsApp-Web style support inbox: conversations on the left, the chat on
// the right. Live over the socket; ticks ✓ sent · ✓✓ delivered · blue ✓✓ read.
const ts = d => new Date(String(d).replace(' ', 'T'));
const hhmm = d => ts(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
function dayLabel(d) {
  const x = ts(d); const t = new Date(); const y = new Date(Date.now() - 86400000);
  if (x.toDateString() === t.toDateString()) return 'Today';
  if (x.toDateString() === y.toDateString()) return 'Yesterday';
  return x.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function listTime(d) {
  if (!d) return '';
  const x = ts(d);
  return x.toDateString() === new Date().toDateString() ? hhmm(d) : x.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}
const isImg = a => /^image\//.test(a.mime || '') || /\.(jpe?g|png|webp|gif)$/i.test(a.name || '');
const isVid = a => /^video\//.test(a.mime || '');
const dl = u => `${u}${u.includes('?') ? '&' : '?'}dl=1`;

function Ticks({ status }) {
  if (status === 'sending') return <span className="text-slate-400 text-[11px]">🕓</span>;
  const c = status === 'read' ? 'text-sky-500' : 'text-slate-400';
  return <span className={`${c} text-[12px] font-bold tracking-[-3px] pr-1`}>{status === 'sent' ? '✓' : '✓✓'}</span>;
}

export default function SupportChat() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const active = params.get('user') ? Number(params.get('user')) : null;
  const [convos, setConvos] = useState([]);
  const [search, setSearch] = useState('');
  const [msgs, setMsgs] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [resident, setResident] = useState(null);
  const bottom = useRef(null);
  const fileRef = useRef(null);
  const [live, setLive] = useState(isConnected());
  useEffect(() => onStatus(setLive), []);
  const activeRef = useRef(active);
  activeRef.current = active;

  const loadConvos = useCallback(async () => {
    try { const { data } = await api.get('/admin/support/conversations', { params: { search: search || undefined } }); setConvos(data.data); }
    catch (e) { toast.error(apiError(e)); }
  }, [search, toast]);
  useEffect(() => { const t = setTimeout(loadConvos, search ? 300 : 0); return () => clearTimeout(t); }, [loadConvos, search]);

  const loadMsgs = useCallback(async () => {
    if (!active) return;
    setLoadingMsgs(true);
    try {
      const [{ data }, u] = await Promise.all([
        api.get(`/admin/support/conversations/${active}`),
        api.get(`/admin/users/${active}`).catch(() => null),
      ]);
      setMsgs(data.data);
      setResident(u?.data?.data || null);
      await api.post(`/admin/support/conversations/${active}/read`);
      setConvos(c => c.map(x => (x.userId === active ? { ...x, unread: 0 } : x)));
    } catch (e) { toast.error(apiError(e)); } finally { setLoadingMsgs(false); }
  }, [active, toast]);
  useEffect(() => { setMsgs([]); setFiles([]); setText(''); loadMsgs(); }, [loadMsgs]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [msgs]);

  // Safety net: re-sync every 4s while the socket is down, every 15s while live.
  useEffect(() => {
    let n = 0;
    const t = setInterval(async () => {
      n += 1;
      if (isConnected() && n % 4 !== 0) return;
      ensureLive();
      try {
        const { data } = await api.get('/admin/support/conversations', { params: { search: search || undefined } });
        setConvos(data.data);
        const uid = activeRef.current;
        if (uid) {
          const r = await api.get(`/admin/support/conversations/${uid}`);
          if (uid !== activeRef.current) return;
          setMsgs(prev => [...r.data.data, ...prev.filter(m => m.tempId)]);
          if (r.data.data.some(m => m.sender === 'user' && m.status !== 'read') && document.visibilityState === 'visible') {
            api.post(`/admin/support/conversations/${uid}/read`).catch(() => {});
          }
        }
      } catch (_) { /* offline */ }
    }, 4000);
    return () => clearInterval(t);
  }, [search]);

  // Live updates
  useEffect(() => {
    const offChat = onSocket('chat', m => {
      if (m.userId === activeRef.current) {
        setMsgs(prev => (prev.some(x => x.id === m.id) ? prev : [...prev.filter(x => !(x.tempId && m.sender === 'admin')), m]));
        if (m.sender === 'user' && document.visibilityState === 'visible') api.post(`/admin/support/conversations/${m.userId}/read`).catch(() => {});
      }
      setConvos(prev => {
        const cur = prev.find(c => c.userId === m.userId);
        const unread = m.sender === 'user' && m.userId !== activeRef.current ? (cur?.unread || 0) + 1 : (cur?.unread || 0);
        const row = {
          ...(cur || { userId: m.userId, name: m.userName, mobile: m.userMobile, total: 0 }),
          lastPreview: m.body || '📎 Attachment', lastAt: m.createdAt, lastSender: m.sender, lastStatus: m.status, unread, total: (cur?.total || 0) + 1,
        };
        return [row, ...prev.filter(c => c.userId !== m.userId)];
      });
    });
    const offRead = onSocket('chat_read', e => {
      if (e.reader === 'user' && e.userId === activeRef.current) setMsgs(prev => prev.map(m => (m.sender === 'admin' ? { ...m, status: 'read' } : m)));
      if (e.reader === 'user') setConvos(prev => prev.map(c => (c.userId === e.userId && c.lastSender === 'admin' ? { ...c, lastStatus: 'read' } : c)));
    });
    const offDel = onSocket('chat_delivered', e => {
      if (e.to === 'user' && e.userId === activeRef.current) setMsgs(prev => prev.map(m => (m.sender === 'admin' && m.status === 'sent' ? { ...m, status: 'delivered' } : m)));
    });
    return () => { offChat(); offRead(); offDel(); };
  }, []);

  async function send() {
    const body = text.trim();
    if (!active || (!body && !files.length)) return;
    const tempId = `t${Date.now()}`;
    setMsgs(prev => [...prev, { id: tempId, tempId, sender: 'admin', body, status: 'sending', createdAt: new Date().toISOString(), attachments: files.map(f => ({ name: f.name, mime: f.type, size: f.size, url: URL.createObjectURL(f) })) }]);
    const form = new FormData();
    form.append('body', body);
    files.forEach(f => form.append('files', f));
    setText(''); setFiles([]); setSending(true);
    try {
      const { data } = await api.post(`/admin/support/conversations/${active}`, form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 });
      setMsgs(prev => { const w = prev.filter(m => m.id !== tempId); return w.some(m => m.id === data.data.id) ? w : [...w, data.data]; });
    } catch (e) {
      setMsgs(prev => prev.filter(m => m.id !== tempId));
      toast.error(apiError(e, 'Message not sent'));
    } finally { setSending(false); }
  }

  const rows = useMemo(() => {
    const out = []; let last = null;
    msgs.forEach(m => { const d = dayLabel(m.createdAt); if (d !== last) { out.push({ day: d, key: `d${m.id}` }); last = d; } out.push(m); });
    return out;
  }, [msgs]);
  const cur = convos.find(c => c.userId === active);
  const totalUnread = convos.reduce((s, c) => s + c.unread, 0);
  const prop = resident?.properties?.[0];

  return (
    <div className="-m-6 h-[calc(100vh-56px)] flex bg-white">
      {/* conversations */}
      <aside className="w-[340px] shrink-0 border-r border-slate-200 flex flex-col">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="font-bold text-slate-800">Support Chat {totalUnread > 0 && <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-xs">{totalUnread}</span>}</div>
            <span className={`flex items-center gap-1 text-[11px] font-semibold ${live ? 'text-emerald-600' : 'text-amber-600'}`} title={live ? 'Real-time connection active' : 'Reconnecting — messages still sync every few seconds'}>
              <span className={`w-2 h-2 rounded-full ${live ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />{live ? 'Live' : 'Connecting…'}
            </span>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resident, phone…" className="mt-2 w-full text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white" />
        </div>
        <ul className="flex-1 overflow-y-auto">
          {convos.length === 0 && <li className="p-6 text-sm text-slate-400 text-center">No conversations yet. Residents start one from Support in the app — or open a resident and click “Chat”.</li>}
          {convos.map(c => (
            <li key={c.userId}>
              <button onClick={() => setParams({ user: String(c.userId) })}
                className={`w-full text-left px-4 py-3 flex gap-3 border-b border-slate-100 hover:bg-slate-50 ${c.userId === active ? 'bg-slate-100' : ''}`}>
                <span className="w-10 h-10 rounded-full bg-brand-primary/10 text-brand-primary grid place-items-center font-bold shrink-0">{(c.name || '?').charAt(0).toUpperCase()}</span>
                <span className="flex-1 min-w-0">
                  <span className="flex justify-between gap-2">
                    <span className="font-semibold text-slate-800 truncate">{c.name || c.mobile || `#${c.userId}`}</span>
                    <span className={`text-[11px] shrink-0 ${c.unread ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>{listTime(c.lastAt)}</span>
                  </span>
                  <span className="flex justify-between gap-2 mt-0.5">
                    <span className="text-xs text-slate-500 truncate">{c.lastSender === 'admin' && <Ticks status={c.lastStatus} />}{c.lastPreview}</span>
                    {c.unread > 0 && <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[11px] font-bold grid place-items-center">{c.unread}</span>}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* thread */}
      {!active ? (
        <div className="flex-1 grid place-items-center bg-[#EEF2F7] text-center text-slate-500">
          <div><div className="text-5xl mb-2">💬</div><div className="font-semibold">Select a conversation</div><div className="text-sm">Messages from residents appear here in real time.</div></div>
        </div>
      ) : (
        <section className="flex-1 flex flex-col min-w-0">
          <header className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-800">{resident?.name || cur?.name || `Resident #${active}`}</div>
              <div className="text-xs text-slate-500">{[resident?.mobile || cur?.mobile, prop && [prop.projectName, prop.tower && `Tower ${prop.tower}`, prop.flatNo].filter(Boolean).join(' · ')].filter(Boolean).join(' · ')}</div>
            </div>
            <Link to={`/users/${active}`} className="text-sm font-semibold text-brand-primary hover:underline">Open profile →</Link>
          </header>
          <div className="flex-1 overflow-y-auto px-6 py-4 bg-[#EEF2F7]">
            {loadingMsgs && !msgs.length && <div className="text-center text-slate-400 text-sm">Loading…</div>}
            {!loadingMsgs && !msgs.length && <div className="text-center text-slate-400 text-sm mt-10">No messages yet — say hello 👋</div>}
            {rows.map(r => (r.day ? (
              <div key={r.key} className="text-center my-3"><span className="text-[11px] bg-white text-slate-500 px-3 py-1 rounded-lg shadow-sm">{r.day}</span></div>
            ) : (
              <div key={r.id} className={`flex my-1 ${r.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[65%] rounded-2xl px-3 pt-1.5 pb-1 shadow-sm ${r.sender === 'admin' ? 'bg-[#DCF3E4] rounded-tr-md' : 'bg-white rounded-tl-md'}`}>
                  {r.sender === 'admin' && r.adminName && <div className="text-[11px] font-bold text-emerald-700">{r.adminName}</div>}
                  {(r.attachments || []).map((a, i) => (isImg(a) ? (
                    <a key={i} href={a.url} target="_blank" rel="noreferrer"><img src={a.url} alt={a.name} className="rounded-lg max-h-64 my-1" /></a>
                  ) : isVid(a) ? (
                    <video key={i} src={a.url} controls className="rounded-lg max-h-64 my-1" />
                  ) : (
                    <a key={i} href={dl(a.url)} className="flex items-center gap-2 bg-white/70 rounded-lg px-3 py-2 my-1 text-sm hover:bg-white">
                      <span>📄</span><span className="truncate max-w-[220px]">{a.name}</span><span className="text-brand-primary">⬇</span>
                    </a>
                  )))}
                  {r.body && <div className="text-[14.5px] text-slate-900 whitespace-pre-wrap break-words">{r.body}</div>}
                  <div className="flex justify-end items-center gap-1 text-[10.5px] text-slate-500">{hhmm(r.createdAt)}{r.sender === 'admin' && <Ticks status={r.status} />}</div>
                </div>
              </div>
            )))}
            <div ref={bottom} />
          </div>
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 pt-2 bg-slate-50 border-t border-slate-200">
              {files.map((f, i) => (
                <span key={i} className="flex items-center gap-2 text-xs bg-white border border-slate-200 rounded-full px-3 py-1">
                  📎 <span className="max-w-[160px] truncate">{f.name}</span>
                  <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-600">✕</button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2 px-4 py-3 bg-slate-50 border-t border-slate-200"
            onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); setFiles(p => [...p, ...e.dataTransfer.files].slice(0, 5)); }}>
            <button onClick={() => fileRef.current?.click()} className="w-10 h-10 rounded-full hover:bg-slate-200 text-xl" title="Attach">📎</button>
            <input ref={fileRef} type="file" multiple className="hidden" accept="image/*,video/*,application/pdf,.doc,.docx,.txt" onChange={e => { setFiles(p => [...p, ...e.target.files].slice(0, 5)); e.target.value = ''; }} />
            <textarea value={text} onChange={e => setText(e.target.value)} rows={1}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Type a message (Enter to send, Shift+Enter for new line)"
              className="flex-1 resize-none max-h-32 text-sm border border-slate-300 rounded-2xl px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
            <button onClick={send} disabled={sending || (!text.trim() && !files.length)} className="w-11 h-11 rounded-full bg-brand-primary text-white text-lg disabled:opacity-40" title="Send">➤</button>
          </div>
        </section>
      )}
    </div>
  );
}
