import React, { useEffect, useState, useCallback } from 'react';
import agentApi, { apiError } from '../../../lib/agentApi';
import { useToast } from '../../../components/Toast';
import DataTable from '../../../components/DataTable';
import StatusBadge from '../../../components/StatusBadge';
import FormModal, { Field, inputClass } from '../../../components/FormModal';
import TicketThread from '../../../components/TicketThread';
import { fmtDateTime } from '../../../lib/format';

export default function AgentTickets() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: '', category: '', body: '' });
  const [busy, setBusy] = useState(false);
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await agentApi.get('/agent/tickets'); setRows(data.data); }
    catch (e) { toast.error(apiError(e, 'Could not load tickets')); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function submit() {
    if (!form.subject.trim() || !form.body.trim()) { toast.error('Subject and message required'); return; }
    setBusy(true);
    try {
      await agentApi.post('/agent/tickets', { subject: form.subject, category: form.category || null, body: form.body });
      toast.success('Ticket created'); setOpen(false); setForm({ subject: '', category: '', body: '' }); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const openThread = useCallback(async (t) => {
    setThread(t); setThreadLoading(true); setMessages([]);
    try { const { data } = await agentApi.get(`/agent/tickets/${t.id}`); setThread(data.data.ticket); setMessages(data.data.messages); }
    catch (e) { toast.error(apiError(e)); } finally { setThreadLoading(false); }
  }, [toast]);

  async function send(body) {
    try { await agentApi.post(`/agent/tickets/${thread.id}/reply`, { body }); openThread(thread); load(); }
    catch (e) { toast.error(apiError(e)); }
  }

  const columns = [
    { key: 'subject', header: 'Subject', render: r => <div><div className="font-medium text-slate-800">{r.subject}</div><div className="text-xs text-slate-400">{r.category || 'general'}</div></div> },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status === 'resolved' || r.status === 'closed' ? 'approved' : r.status === 'open' ? 'pending' : 'preparing'}>{r.status.replace('_', ' ')}</StatusBadge> },
    { key: 'lastMessageAt', header: 'Updated', render: r => fmtDateTime(r.lastMessageAt) },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div><h2 className="text-lg font-bold text-slate-800">Support</h2><p className="text-sm text-slate-500">Raise a ticket, we'll help.</p></div>
        <button onClick={() => setOpen(true)} className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90">+ New ticket</button>
      </div>

      <DataTable columns={columns} rows={rows} loading={loading} empty="No tickets yet."
        actions={r => <button onClick={() => openThread(r)} className="text-brand-primary font-semibold hover:underline">Open</button>} />

      <FormModal open={open} title="New support ticket" onClose={() => setOpen(false)} onSubmit={submit} submitting={busy} submitLabel="Create">
        <Field label="Subject" required><input className={inputClass} value={form.subject} onChange={e => set('subject', e.target.value)} /></Field>
        <Field label="Category"><input className={inputClass} placeholder="Payout / Lead / Technical…" value={form.category} onChange={e => set('category', e.target.value)} /></Field>
        <Field label="Message" required><textarea className={inputClass} rows={4} value={form.body} onChange={e => set('body', e.target.value)} /></Field>
      </FormModal>

      <TicketThread open={!!thread} ticket={thread} messages={messages} loading={threadLoading} onClose={() => setThread(null)} onSend={send} />
    </div>
  );
}
