import React, { useEffect, useRef, useState } from 'react';
import agentApi, { apiError } from '../../../lib/agentApi';
import { useToast } from '../../../components/Toast';

const SUGGESTIONS = [
  'What projects are available right now?',
  'Price range for 2BHK?',
  'How do I register a lead?',
  'What is my commission on a booking?',
];

export default function AgentAi() {
  const toast = useToast();
  const [messages, setMessages] = useState([{ role: 'assistant', content: 'Hi! I\'m your sales assistant. Ask me about projects, pricing, inventory or process.' }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);

  async function send(text) {
    const msg = (text ?? input).trim();
    if (!msg || busy) return;
    setInput('');
    const history = messages.filter(m => m.role === 'user' || m.role === 'assistant').slice(-6);
    setMessages(m => [...m, { role: 'user', content: msg }]);
    setBusy(true);
    try {
      const { data } = await agentApi.post('/agent/ai/chat', { message: msg, history });
      setMessages(m => [...m, { role: 'assistant', content: data.data.reply }]);
    } catch (e) {
      toast.error(apiError(e, 'AI unavailable'));
      setMessages(m => [...m, { role: 'assistant', content: 'Sorry, I could not answer right now.' }]);
    } finally { setBusy(false); }
  }

  return (
    <div className="max-w-3xl flex flex-col h-[calc(100vh-7rem)]">
      <h2 className="text-lg font-bold text-slate-800 mb-1">Sales Assistant 🤖</h2>
      <p className="text-sm text-slate-500 mb-3">Pricing, inventory, scripts & process — instantly.</p>

      <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[85%] ${m.role === 'user' ? 'ml-auto' : ''}`}>
            <div className={`inline-block rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-brand-primary text-white' : 'bg-slate-100 text-slate-800'}`}>{m.content}</div>
          </div>
        ))}
        {busy && <div className="text-slate-400 text-sm">Thinking…</div>}
        <div ref={endRef} />
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {SUGGESTIONS.map(s => <button key={s} onClick={() => send(s)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-50">{s}</button>)}
        </div>
      )}

      <form onSubmit={e => { e.preventDefault(); send(); }} className="flex gap-2 mt-3">
        <input className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30" placeholder="Ask anything…" value={input} onChange={e => setInput(e.target.value)} />
        <button type="submit" disabled={busy} className="px-5 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50">Send</button>
      </form>
    </div>
  );
}
