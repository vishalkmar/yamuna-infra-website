import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { inputClass } from '../../components/FormModal';
import { fmtDateTime } from '../../lib/format';
import { Panel, PagedTable, Pill, Chips } from '../../components/Dash';

// ---------------------------------------------------------------- Actions
// Email the resident (address fixed to the one on file) + quick links.
export default function ResidentActions({ user, onSent }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);
  if (!user) return null;

  const addFiles = list => {
    const next = [...files, ...list].slice(0, 5);
    if (next.some(f => f.size > 10 * 1024 * 1024)) { toast.error('Each attachment must be under 10 MB'); return; }
    setFiles(next);
  };

  async function send() {
    if (!subject.trim() || !body.trim()) { toast.error('Subject and message are required'); return; }
    setBusy(true);
    try {
      const form = new FormData();
      form.append('subject', subject.trim());
      form.append('body', body);
      files.forEach(f => form.append('files', f));
      const { data } = await api.post(`/admin/users/${user.id}/email`, form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 90000 });
      toast.success(data.message || 'Email sent');
      setSubject(''); setBody(''); setFiles([]);
      onSent && onSent();
    } catch (e) { toast.error(apiError(e, 'Email could not be sent')); } finally { setBusy(false); }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Panel title="✉️ Send email" subtitle="Goes to the resident's registered email. Logged under Emails & vouchers." className="lg:col-span-2">
        <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
        <input value={user.email || 'No email address on file'} readOnly disabled className={`${inputClass} bg-slate-100 text-slate-600 cursor-not-allowed mb-3`} />
        <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
        <input value={subject} onChange={e => setSubject(e.target.value)} maxLength={200} className={`${inputClass} mb-3`} placeholder="e.g. Your possession letter" disabled={!user.email} />
        <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
        <textarea rows={8} value={body} onChange={e => setBody(e.target.value)} className={`${inputClass} mb-3`} placeholder="Write your message…" disabled={!user.email} />
        <div
          onClick={() => user.email && ref.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); addFiles([...e.dataTransfer.files]); }}
          className="border-2 border-dashed border-slate-300 rounded-xl px-4 py-4 text-center text-sm text-slate-500 cursor-pointer hover:border-brand-primary/60"
        >
          📎 Drag & drop attachments or click to choose (up to 5, 10 MB each)
          <input ref={ref} type="file" multiple className="hidden" onChange={e => { addFiles([...e.target.files]); e.target.value = ''; }} />
        </div>
        {files.length > 0 && (
          <ul className="mt-2 space-y-1">
            {files.map((f, i) => (
              <li key={i} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-1.5">
                <span className="truncate">📄 {f.name} <span className="text-slate-400">({Math.max(1, Math.round(f.size / 1024))} KB)</span></span>
                <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))} className="text-rose-600 text-xs font-semibold">Remove</button>
              </li>
            ))}
          </ul>
        )}
        <button onClick={send} disabled={busy || !user.email} className="mt-3 px-5 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold disabled:opacity-50">
          {busy ? 'Sending…' : 'Send email'}
        </button>
      </Panel>
      <Panel title="Quick actions">
        <div className="space-y-2">
          <button onClick={() => navigate(`/support-chat?user=${user.id}`)} className="w-full text-left px-3 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-semibold">💬 Open support chat</button>
          {user.mobile && <a href={`tel:${user.mobile}`} className="block px-3 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-semibold">📞 Call {user.mobile}</a>}
          {user.mobile && <a href={`https://wa.me/91${String(user.mobile).replace(/\D/g, '').slice(-10)}`} target="_blank" rel="noreferrer" className="block px-3 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-semibold">🟢 WhatsApp</a>}
          <button onClick={() => navigate('/dockets')} className="w-full text-left px-3 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-semibold">📘 Upload booking docket</button>
        </div>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------- Audit
// Everything the office did on this resident: who, when, what.
const WHAT = [
  [/^users\/\d+\/properties/, 'DELETE', 'Removed a property'], [/^users\/\d+\/properties/, 'PUT', 'Edited a property'], [/^users\/\d+\/properties/, 'POST', 'Added a property'],
  [/^users\/\d+\/email/, null, 'Sent an email'], [/^users\/\d+\/send-welcome/, null, 'Re-sent the account summary'],
  [/^users\/\d+\/kyc/, null, 'Reviewed KYC'], [/^users\/\d+\/status/, null, 'Changed account status'], [/^users\/\d+\/notes/, null, 'Updated admin notes'],
  [/^users$/, 'POST', 'Created the resident'], [/^users$/, 'PUT', 'Edited the profile'], [/^users$/, 'DELETE', 'Deleted the resident'],
  [/^payment-plan\/installment\/pay/, null, 'Marked an installment paid'], [/^payment-plan\/installment\/unpay/, null, 'Marked an installment unpaid'],
  [/^payment-plan\/installment$/, 'PUT', 'Edited an installment'], [/^payment-plan\/installment$/, 'DELETE', 'Deleted an installment'],
  [/^payment-plan\/property\/generate/, null, 'Generated the payment schedule'], [/^payment-plan\/property\/installments/, null, 'Added an installment'],
  [/^payment-plan\/property$/, 'PUT', 'Saved the payment plan'],
  [/^documents\/upload/, null, 'Uploaded a docket'], [/^documents$/, 'DELETE', 'Removed a document'], [/^documents$/, 'POST', 'Added a document'],
  [/^construction/, null, 'Updated construction progress'], [/^sos\/alerts\/(ack|respond)/, null, 'Responded to an SOS'],
  [/^support\/conversations\/read/, null, 'Read chat messages'], [/^support\/conversations/, 'POST', 'Replied in support chat'],
];
function describe(r) {
  const e = String(r.entity || '').replace(/\/\d+/g, '');
  const e2 = String(r.entity || '');
  for (const [re, method, label] of WHAT) {
    if ((re.test(e2) || re.test(e)) && (!method || method === r.action)) return label;
  }
  return `${r.action} ${r.entity}`;
}
const GROUP = l => (/payment|installment|schedule/i.test(l) ? 'Payments' : /docket|document/i.test(l) ? 'Documents' : /chat|email|summary/i.test(l) ? 'Messages' : /SOS/.test(l) ? 'SOS' : 'Profile');

export function ResidentAudit({ userId }) {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [group, setGroup] = useState('');
  useEffect(() => {
    api.get(`/admin/users/${userId}/audit`).then(r => setRows(r.data.data.map(x => ({ ...x, what: describe(x) })))).catch(e => { toast.error(apiError(e)); setRows([]); });
  }, [userId, toast]);
  const shown = useMemo(() => (rows || []).filter(r => !group || GROUP(r.what) === group), [rows, group]);
  if (!rows) return <div className="text-slate-400">Loading…</div>;
  const groups = ['Profile', 'Payments', 'Documents', 'Messages', 'SOS'];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">Every change the office made to this resident — who did it and when. (Recorded from now on for all admin actions.)</p>
        <Chips value={group} onChange={setGroup} options={[{ key: '', label: 'All', count: rows.length }, ...groups.map(g => ({ key: g, label: g, count: rows.filter(r => GROUP(r.what) === g).length }))]} />
      </div>
      <PagedTable rows={shown} initialSort={{ key: 'createdAt', dir: 'desc' }} empty="No admin actions recorded for this resident yet" columns={[
        { key: 'createdAt', header: 'When', render: r => <span className="text-xs whitespace-nowrap">{fmtDateTime(r.createdAt)}</span> },
        { key: 'adminName', header: 'Who', render: r => <b>{r.adminName || `Admin #${r.adminId}`}</b> },
        { key: 'what', header: 'What', render: r => <span>{r.what} <Pill tone="slate">{GROUP(r.what)}</Pill></span> },
        { key: 'details', header: 'Details', noSort: true, render: r => (r.details ? (
          <span className="text-xs text-slate-500 block max-w-[420px] truncate" title={JSON.stringify(r.details)}>
            {Object.entries(r.details).filter(([, v]) => v != null && v !== '' && typeof v !== 'object').slice(0, 6).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—'}
          </span>
        ) : '—') },
      ]} />
    </div>
  );
}
