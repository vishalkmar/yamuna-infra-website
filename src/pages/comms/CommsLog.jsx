import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import FormModal from '../../components/FormModal';
import { fmtDateTime } from '../../lib/format';
import { Kpi, KpiGrid, FilterPanel, FilterField, SelectFilter, DateFilter, ctl, PagedTable, Pill } from '../../components/Dash';
import { presetRange, inr, exportCsv } from '../../lib/dash';
import { onActivity, eventMeta, EVENT_META } from '../../lib/live';

// Every message sent to residents — emails, in-app/phone notifications and the
// PDF vouchers attached to them — with live updates. Used on the
// Communications page (all residents) and in a resident's 360 (userId).
const D = { preset: '', from: '', to: '' };
const EMPTY = { q: '', event: '', date: D, channel: '', status: '' };

const STATUS = {
  sent: ['Sent', 'green'], failed: ['Failed', 'red'], no_email: ['No email on file', 'amber'], skipped: ['—', 'slate'],
  not_configured: ['Firebase not set up', 'slate'], no_device: ['App not on phone', 'slate'],
};
const status = s => (s ? STATUS[s] || [s, 'slate'] : null);
const dl = url => `${url}${url.includes('?') ? '&' : '?'}dl=1`;

export default function CommsLog({ userId, compact = false }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState(EMPTY);
  const [open, setOpen] = useState(null);
  const [fresh, setFresh] = useState(new Set());
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const range = presetRange(f.date.preset, f.date);
  const params = useMemo(() => ({
    userId: userId || undefined, event: f.event || undefined, channel: f.channel || undefined, status: f.status || undefined,
    from: range?.from && range.from !== '0000-01-01' ? range.from : undefined,
    to: range?.to && range.to !== '9999-12-31' ? range.to : undefined,
    pageSize: 500,
  }), [userId, f.event, f.channel, f.status, range?.from, range?.to]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, sum] = await Promise.all([
        api.get('/admin/comms', { params }),
        api.get('/admin/comms/summary', { params: { userId: userId || undefined } }),
      ]);
      setRows(list.data.data.rows);
      setSummary(sum.data.data);
    } catch (e) { toast.error(apiError(e, 'Could not load communications')); } finally { setLoading(false); }
  }, [params, userId, toast]);
  useEffect(() => { load(); }, [load]);

  // Live: new events appear at the top, highlighted.
  useEffect(() => onActivity(r => {
    if (userId && Number(r.userId) !== Number(userId)) return;
    setRows(prev => (prev.some(x => x.id === r.id) ? prev : [r, ...prev]));
    setFresh(s => new Set(s).add(r.id));
    setSummary(s => (s ? { ...s, total: s.total + 1, today: s.today + 1 } : s));
  }), [userId]);

  const q = f.q.trim().toLowerCase();
  const shown = useMemo(() => (q ? rows.filter(r => [r.title, r.body, r.userName, r.userMobile, r.refId, r.emailTo, JSON.stringify(r.meta || {})]
    .join(' ').toLowerCase().includes(q)) : rows), [rows, q]);
  const active = Object.entries(f).filter(([k, v]) => (k === 'date' ? v.preset : v)).length;
  const amountShown = shown.reduce((s, r) => s + (['payment_received', 'app_payment'].includes(r.event) ? Number(r.amount || 0) : 0), 0);
  const byEvent = Object.fromEntries((summary?.byEvent || []).map(b => [b.event, b]));

  const columns = [
    { key: 'createdAt', header: 'When', render: r => <span className="whitespace-nowrap text-xs">{r._fresh && <span className="mr-1 px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[10px] font-bold">NEW</span>}{fmtDateTime(r.createdAt)}</span> },
    ...(userId ? [] : [{ key: 'userName', header: 'Resident', render: r => (r.userId
      ? <Link to={`/users/${r.userId}?tab=comms`} onClick={e => e.stopPropagation()} className="text-brand-primary hover:underline">{r.userName || `#${r.userId}`}</Link>
      : <span className="text-slate-500">All residents ({r.recipients})</span>) }]),
    { key: 'event', header: 'Event', render: r => { const m = eventMeta(r.event); return <Pill tone={m.tone}>{m.icon} {m.label}</Pill>; } },
    { key: 'title', header: 'Message', render: r => (
      <div className="max-w-[320px]">
        <div className="font-medium text-slate-800 truncate">{r.title}</div>
        {!compact && r.body && <div className="text-xs text-slate-400 truncate">{r.body}</div>}
      </div>
    ) },
    { key: 'amount', header: 'Amount', align: 'right', render: r => (r.amount != null ? <b>{inr(r.amount)}</b> : '—') },
    { key: 'refId', header: 'Reference', render: r => <span className="font-mono text-[11px] text-slate-500">{r.meta?.receiptNo || r.meta?.orderId || r.refId || '—'}</span> },
    { key: 'emailStatus', header: 'Email', render: r => { const s = status(r.emailStatus); return s ? <Pill tone={s[1]}>{s[0]}</Pill> : '—'; } },
    { key: 'pushStatus', header: 'Phone', render: r => { const s = status(r.pushStatus); return s ? <Pill tone={s[1]}>{s[0]}</Pill> : '—'; } },
    { key: 'attachments', header: 'Voucher / PDF', noSort: true, render: r => (r.attachments?.length ? (
      <div className="flex flex-col gap-0.5">
        {r.attachments.map(a => (
          <a key={a.url} href={dl(a.url)} onClick={e => e.stopPropagation()} className="text-xs text-brand-primary hover:underline whitespace-nowrap">⬇ {a.name}</a>
        ))}
      </div>
    ) : '—') },
  ];

  const runReminders = async () => {
    try {
      const { data } = await api.post('/admin/comms/run-reminders', {}, { timeout: 120000 });
      toast.success(`Checked ${data.data.checked} installment(s) · sent ${data.data.sent} reminder(s)`);
      load();
    } catch (e) { toast.error(apiError(e, 'Could not run reminders')); }
  };

  return (
    <div className="space-y-4">
      {!compact && summary && !summary.pushConfigured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <b>Phone (Firebase) notifications are not set up yet.</b> In-app bell notifications, live updates and emails work now.
          To also ring residents' phones when the app is closed, add the Firebase service-account JSON as <code>FIREBASE_SERVICE_ACCOUNT</code> on Render.
        </div>
      )}
      <KpiGrid>
        <Kpi label="Messages sent" value={summary?.total ?? '…'} sub={`${summary?.today ?? 0} today`} icon="📨" />
        <Kpi label="Emails delivered" value={summary?.emailsSent ?? '…'} tone="green" icon="✉️" onClick={() => set('channel', f.channel === 'email' ? '' : 'email')} active={f.channel === 'email'} />
        <Kpi label="Emails failed" value={summary?.emailsFailed ?? '…'} tone={summary?.emailsFailed ? 'red' : 'default'} icon="⚠️" onClick={() => set('status', f.status === 'failed' ? '' : 'failed')} active={f.status === 'failed'} />
        <Kpi label="Vouchers / PDFs" value={summary?.withAttachments ?? '…'} icon="🧾" onClick={() => set('channel', f.channel === 'attachments' ? '' : 'attachments')} active={f.channel === 'attachments'} />
        <Kpi label="Receipts sent" value={(byEvent.payment_received?.count || 0) + (byEvent.app_payment?.count || 0)}
          sub={inr((byEvent.payment_received?.amount || 0) + (byEvent.app_payment?.amount || 0))} tone="green" icon="✅" />
        <Kpi label="Due reminders" value={(byEvent.due_reminder?.count || 0) + (byEvent.payment_overdue?.count || 0)}
          sub={`${byEvent.payment_overdue?.count || 0} overdue notices`} tone="amber" icon="⏰" onClick={() => set('event', f.event === 'due_reminder' ? '' : 'due_reminder')} active={f.event === 'due_reminder'} />
      </KpiGrid>

      <FilterPanel active={active} onReset={() => setF(EMPTY)} extra={<>
        {!userId && <button onClick={runReminders} className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50">⏰ Send today's due reminders</button>}
        <button onClick={() => exportCsv(`communications${userId ? `-resident-${userId}` : ''}.csv`, [
          ['When', r => r.createdAt], ['Resident', r => r.userName || 'All'], ['Mobile', r => r.userMobile], ['Event', r => eventMeta(r.event).label],
          ['Title', r => r.title], ['Message', r => r.body], ['Amount', r => r.amount], ['Receipt', r => r.meta?.receiptNo], ['Order ID', r => r.meta?.orderId],
          ['Txn / Ref', r => r.meta?.txnId || r.meta?.cashfree?.cfPaymentId], ['Bank ref', r => r.meta?.cashfree?.bankReference],
          ['Email to', r => r.emailTo], ['Email', r => r.emailStatus], ['Phone', r => r.pushStatus], ['Attachments', r => (r.attachments || []).map(a => a.url).join(' ')], ['By', r => r.actor],
        ], shown)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50">⬇ Export CSV</button>
        <button onClick={load} className="px-3 py-1.5 rounded-lg bg-brand-primary text-white text-sm font-semibold">↻ Refresh</button>
      </>}>
        <FilterField label="Search" className="col-span-2">
          <input value={f.q} onChange={e => set('q', e.target.value)} placeholder="Name, mobile, receipt, order id, UTR…" className={ctl} />
        </FilterField>
        <SelectFilter label="Event" value={f.event} onChange={v => set('event', v)} options={Object.entries(EVENT_META).map(([value, m]) => ({ value, label: `${m.icon} ${m.label}` }))} />
        <DateFilter label="Date" value={f.date} onChange={v => set('date', v)} presets={['', 'today', 'yesterday', 'this_week', 'last_7', 'this_month', 'last_30', 'last_month', 'this_year', 'custom']} />
        <SelectFilter label="Channel" value={f.channel} onChange={v => set('channel', v)} options={[{ value: 'email', label: 'Emailed' }, { value: 'push', label: 'Phone push' }, { value: 'attachments', label: 'Has voucher / PDF' }]} />
        <SelectFilter label="Delivery" value={f.status} onChange={v => set('status', v)} options={[{ value: 'failed', label: 'Failed only' }]} />
      </FilterPanel>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{loading ? 'Loading…' : `${shown.length} message(s)`}{amountShown ? ` · payments ${inr(amountShown)}` : ''}</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live</span>
      </div>
      <PagedTable columns={columns} rows={shown.map(r => ({ ...r, _fresh: fresh.has(r.id) }))} onRow={setOpen} pageSize={compact ? 15 : 25} />

      <FormModal open={!!open} title={open ? `${eventMeta(open.event).icon} ${open.title}` : ''} onClose={() => setOpen(null)} onSubmit={() => setOpen(null)} submitLabel="Close" wide>
        {open && <Detail r={open} />}
      </FormModal>
    </div>
  );
}

function Row({ k, v }) {
  if (v == null || v === '') return null;
  return (
    <div className="grid grid-cols-3 gap-3 py-1.5 border-b border-slate-50 text-sm">
      <div className="text-slate-500">{k}</div>
      <div className="col-span-2 text-slate-800 break-words">{v}</div>
    </div>
  );
}

function Detail({ r }) {
  const m = r.meta || {};
  const cf = m.cashfree || {};
  return (
    <div className="space-y-4">
      {r.body && <p className="text-sm text-slate-600">{r.body}</p>}
      <div>
        <Row k="When" v={fmtDateTime(r.createdAt)} />
        <Row k="Resident" v={r.userId ? `${r.userName || ''} (#${r.userId}) ${r.userMobile ? `· ${r.userMobile}` : ''}` : `All residents (${r.recipients})`} />
        <Row k="Event" v={eventMeta(r.event).label} />
        <Row k="Amount" v={r.amount != null ? inr(r.amount) : null} />
        <Row k="Receipt no." v={m.receiptNo} />
        <Row k="Property" v={m.property} />
        <Row k="Installment" v={m.installment ? `${m.installment}${m.seq ? ` (#${m.seq})` : ''}` : null} />
        <Row k="Order ID" v={m.orderId} />
        <Row k="Transaction / ref ID" v={m.txnId || cf.cfPaymentId} />
        <Row k="Cashfree payment ID" v={cf.cfPaymentId} />
        <Row k="Bank reference (UTR)" v={cf.bankReference} />
        <Row k="Payment mode" v={[cf.mode, cf.instrument].filter(Boolean).join(' · ') || m.method} />
        <Row k="Paid on (gateway)" v={cf.paidAt ? fmtDateTime(cf.paidAt) : null} />
        <Row k="Items" v={Array.isArray(m.items) ? m.items.map(i => `${i.qty ? `${i.qty}× ` : ''}${i.name}${i.amount != null ? ` (${inr(i.amount)})` : ''}`).join(', ') : m.remarks} />
        <Row k="Outstanding after" v={m.outstandingAfter != null ? inr(m.outstandingAfter) : null} />
        <Row k="Due date" v={m.dueDate} />
        <Row k="Late fee if missed" v={m.lateFee ? inr(m.lateFee) : null} />
        <Row k="Properties" v={Array.isArray(m.properties) ? m.properties.map(p => `${p.name} — ${inr(p.agreementValue)}, ${p.installments} installments`).join(' | ') : null} />
        <Row k="Docket" v={m.title && r.event === 'docket_uploaded' ? m.title : null} />
        <Row k="Email to" v={r.emailTo} />
        <Row k="Email subject" v={r.emailSubject} />
        <Row k="Email status" v={r.emailStatus ? `${status(r.emailStatus)[0]}${r.emailError ? ` — ${r.emailError}` : ''}` : null} />
        <Row k="Phone notification" v={r.pushStatus ? `${status(r.pushStatus)[0]}${r.pushSent ? ` (${r.pushSent} device)` : ''}` : null} />
        <Row k="In-app (bell)" v={r.inappId ? `Delivered (#${r.inappId})` : r.recipients > 1 ? `Delivered to ${r.recipients} residents` : null} />
        <Row k="By" v={r.actor} />
      </div>
      {r.attachments?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {r.attachments.map(a => (
            <a key={a.url} href={dl(a.url)} className="px-3 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold">⬇ Download {a.name}</a>
          ))}
        </div>
      )}
    </div>
  );
}
