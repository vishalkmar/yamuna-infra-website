import React, { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../../../lib/api';
import { useToast } from '../../../components/Toast';
import PageHeader from '../../../components/PageHeader';
import DataTable from '../../../components/DataTable';
import FormModal, { Field, inputClass } from '../../../components/FormModal';
import { fmtDateTime } from '../../../lib/format';

export default function AgentNotify() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tiers, setTiers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', link: '', audience: 'all', tierId: '', agentId: '' });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/admin/agent-notifications'); setRows(data.data); }
    catch (e) { toast.error(apiError(e, 'Could not load history')); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get('/admin/agents/tiers').then(r => setTiers(r.data.data)).catch(() => {});
    api.get('/admin/agents', { params: { pageSize: 100 } }).then(r => setAgents(r.data.data.rows)).catch(() => {});
  }, []);

  async function submit() {
    if (!form.title.trim()) { toast.error('Title required'); return; }
    setBusy(true);
    try {
      await api.post('/admin/agent-notifications', {
        title: form.title, body: form.body || null, link: form.link || null,
        audience: form.audience,
        tierId: form.audience === 'tier' && form.tierId ? Number(form.tierId) : null,
        agentId: form.audience === 'agent' && form.agentId ? Number(form.agentId) : null,
      });
      toast.success('Broadcast sent');
      setOpen(false); setForm({ title: '', body: '', link: '', audience: 'all', tierId: '', agentId: '' });
      load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const columns = [
    { key: 'title', header: 'Title', render: r => <div><div className="font-medium text-slate-800">{r.title}</div><div className="text-xs text-slate-400 line-clamp-1">{r.body}</div></div> },
    { key: 'audience', header: 'Audience', render: r => r.audience },
    { key: 'sentCount', header: 'Sent', render: r => r.sentCount },
    { key: 'readCount', header: 'Read', render: r => `${r.readCount}/${r.sentCount}` },
    { key: 'createdAt', header: 'When', render: r => fmtDateTime(r.createdAt) },
  ];

  return (
    <div>
      <PageHeader title="Agent Broadcasts" subtitle="Send notifications to your partners">
        <button onClick={() => setOpen(true)} className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90">+ New broadcast</button>
      </PageHeader>

      <DataTable columns={columns} rows={rows} loading={loading} empty="No broadcasts yet." />

      <FormModal open={open} title="New broadcast" onClose={() => setOpen(false)} onSubmit={submit} submitting={busy} submitLabel="Send">
        <Field label="Title" required><input className={inputClass} value={form.title} onChange={e => set('title', e.target.value)} /></Field>
        <Field label="Message"><textarea className={inputClass} rows={3} value={form.body} onChange={e => set('body', e.target.value)} /></Field>
        <Field label="Link (optional)"><input className={inputClass} placeholder="/agent/inventory" value={form.link} onChange={e => set('link', e.target.value)} /></Field>
        <Field label="Audience"><select className={inputClass} value={form.audience} onChange={e => set('audience', e.target.value)}><option value="all">All active agents</option><option value="tier">By tier</option><option value="agent">Single agent</option></select></Field>
        {form.audience === 'tier' && <Field label="Tier"><select className={inputClass} value={form.tierId} onChange={e => set('tierId', e.target.value)}><option value="">— Select —</option>{tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>}
        {form.audience === 'agent' && <Field label="Agent"><select className={inputClass} value={form.agentId} onChange={e => set('agentId', e.target.value)}><option value="">— Select —</option>{agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>}
      </FormModal>
    </div>
  );
}
