import React, { useEffect, useState } from 'react';
import agentApi, { apiError } from '../../../lib/agentApi';
import { useToast } from '../../../components/Toast';
import FormModal, { Field, inputClass } from '../../../components/FormModal';

const CHANNELS = [
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'sms', label: 'SMS' },
  { key: 'email', label: 'Email' },
];

function fill(text, lead) {
  return (text || '').replace(/\{\{name\}\}/g, lead?.name || '').replace(/\{\{project\}\}/g, lead?.projectName || 'our project');
}
function waNumber(phone) {
  const d = (phone || '').replace(/\D/g, '');
  if (d.length === 10) return '91' + d;
  return d;
}

// Agent lead nurture (5.6): pick a channel + template, send via server (sms/email)
// or open WhatsApp (wa.me) — every send is logged on the lead timeline.
export default function LeadReachOutModal({ open, lead, onClose }) {
  const toast = useToast();
  const [channel, setChannel] = useState('whatsapp');
  const [templates, setTemplates] = useState([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setChannel('whatsapp'); setSubject(''); setBody('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    agentApi.get('/agent/leads/templates', { params: { channel } }).then(r => setTemplates(r.data.data)).catch(() => setTemplates([]));
  }, [open, channel]);

  function applyTemplate(t) {
    setBody(fill(t.body, lead));
    if (t.subject) setSubject(fill(t.subject, lead));
  }

  async function send() {
    if (!body.trim()) { toast.error('Message is empty'); return; }
    setBusy(true);
    try {
      await agentApi.post(`/agent/leads/${lead.id}/outreach`, { channel, subject: subject || null, body });
      if (channel === 'whatsapp') {
        const num = waNumber(lead.phone);
        window.open(`https://wa.me/${num}?text=${encodeURIComponent(body)}`, '_blank');
      }
      toast.success(channel === 'whatsapp' ? 'Opening WhatsApp…' : `${channel} sent`);
      onClose();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  if (!open) return null;

  return (
    <FormModal open={open} title={`Reach out — ${lead?.name || ''}`} onClose={onClose} onSubmit={send} submitting={busy} submitLabel={channel === 'whatsapp' ? 'Open WhatsApp' : 'Send'}>
      <div className="flex gap-1 mb-1">
        {CHANNELS.map(c => (
          <button type="button" key={c.key} onClick={() => setChannel(c.key)} className={`px-3 py-1.5 rounded-lg text-sm border ${channel === c.key ? 'bg-brand-primary text-white border-brand-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>{c.label}</button>
        ))}
      </div>
      <p className="text-xs text-slate-400">{channel === 'email' ? (lead?.email || 'No email on lead') : (lead?.phone || 'No phone on lead')}</p>

      {templates.length > 0 && (
        <Field label="Template">
          <select className={inputClass} onChange={e => { const t = templates.find(x => String(x.id) === e.target.value); if (t) applyTemplate(t); }}>
            <option value="">— Pick a template —</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </Field>
      )}
      {channel === 'email' && <Field label="Subject"><input className={inputClass} value={subject} onChange={e => setSubject(e.target.value)} /></Field>}
      <Field label="Message" required><textarea className={inputClass} rows={5} value={body} onChange={e => setBody(e.target.value)} /></Field>
    </FormModal>
  );
}
