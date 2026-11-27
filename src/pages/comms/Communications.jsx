import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import { fmtDateTime } from '../../lib/format';
import { Kpi, KpiGrid, Panel, BarList, FilterPanel, FilterField, SelectFilter, DateFilter, ctl, PagedTable, Pill, Chips } from '../../components/Dash';
import { presetRange, inRange, inr, sum, groupBy, exportCsv } from '../../lib/dash';
import { onActivity } from '../../lib/live';
import CommsLog from './CommsLog';

// Office record of everything the residents receive + every app payment.
export default function Communications() {
  const [params, setParams] = useSearchParams();
  const view = params.get('view') || 'messages';
  return (
    <div>
      <PageHeader title="Customer Communications & Vouchers"
        subtitle="Every email, in-app/phone notification, receipt and docket sent to residents — and every payment made in the app. Updates live." />
      <div className="mb-4">
        <Chips value={view} onChange={v => setParams(v === 'messages' ? {} : { view: v })} options={[
          { key: 'messages', label: '📨 Messages, receipts & dockets' },
          { key: 'payments', label: '💳 App transactions (Cashfree)' },
        ]} />
      </div>
      {view === 'payments' ? <AppPayments /> : <CommsLog />}
    </div>
  );
}

const PURPOSE = { food: '🍲 Food', ride: '🚕 Ride', service: '🛎️ Service', other: 'Other' };
const STATUS = { paid: ['Paid', 'green'], created: ['Not completed', 'amber'], failed: ['Failed', 'red'], cancelled: ['Expired', 'slate'] };
const D = { preset: '', from: '', to: '' };
const EMPTY = { q: '', status: '', purpose: '', date: D, mode: '' };

export function AppPayments({ userId }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState(EMPTY);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/comms/app-payments', { params: { userId: userId || undefined } });
      setRows(data.data);
    } catch (e) { toast.error(apiError(e, 'Could not load app transactions')); } finally { setLoading(false); }
  }, [userId, toast]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => onActivity(r => { if (r.event === 'app_payment') load(); }), [load]);

  const range = presetRange(f.date.preset, f.date);
  const q = f.q.trim().toLowerCase();
  const shown = useMemo(() => rows.filter(r => {
    if (f.status && r.status !== f.status) return false;
    if (f.purpose && r.purpose !== f.purpose) return false;
    if (f.mode && !String(r.payMode || '').toLowerCase().includes(f.mode)) return false;
    if (range && !inRange(r.createdAt, range)) return false;
    if (q && ![r.orderId, r.userName, r.userMobile, r.remarks, r.cfPaymentId, r.bankRef].join(' ').toLowerCase().includes(q)) return false;
    return true;
  }), [rows, f, range, q]);
  const paid = shown.filter(r => r.status === 'paid');
  const active = Object.entries(f).filter(([k, v]) => (k === 'date' ? v.preset : v)).length;

  const columns = [
    { key: 'createdAt', header: 'When', render: r => <span className="text-xs whitespace-nowrap">{fmtDateTime(r.createdAt)}</span> },
    ...(userId ? [] : [{ key: 'userName', header: 'Resident', render: r => <Link to={`/users/${r.userId}?tab=comms`} className="text-brand-primary hover:underline">{r.userName || `#${r.userId}`}</Link> }]),
    { key: 'purpose', header: 'For', render: r => PURPOSE[r.purpose] || r.purpose },
    { key: 'remarks', header: 'What was booked', render: r => (
      <div className="max-w-[280px] text-xs text-slate-600">
        {r.items?.length ? r.items.map(i => `${i.qty ? `${i.qty}× ` : ''}${i.name}`).join(', ') : (r.remarks || '—')}
      </div>
    ) },
    { key: 'amount', header: 'Amount', align: 'right', sort: r => r.amount, render: r => <b>{inr(r.amount)}</b> },
    { key: 'status', header: 'Status', render: r => { const s = STATUS[r.status] || [r.status, 'slate']; return <Pill tone={s[1]}>{s[0]}</Pill>; } },
    { key: 'orderId', header: 'Order ID', render: r => <span className="font-mono text-[11px]">{r.orderId}</span> },
    { key: 'cfPaymentId', header: 'Txn ID / UTR', render: r => (
      <span className="font-mono text-[11px] text-slate-500">{r.cfPaymentId || '—'}{r.bankRef ? <><br />UTR {r.bankRef}</> : null}</span>
    ) },
    { key: 'payMode', header: 'Mode', render: r => r.payMode || '—' },
    { key: 'paidAt', header: 'Paid at', render: r => (r.paidAt ? <span className="text-xs whitespace-nowrap">{fmtDateTime(r.paidAt)}</span> : '—') },
  ];

  return (
    <div className="space-y-4">
      <KpiGrid>
        <Kpi label="Collected" value={inr(sum(paid, r => r.amount))} sub={`${paid.length} paid`} tone="green" icon="💰" onClick={() => set('status', f.status === 'paid' ? '' : 'paid')} active={f.status === 'paid'} />
        <Kpi label="Checkouts started" value={shown.length} icon="🛒" />
        <Kpi label="Not completed" value={shown.filter(r => r.status === 'created').length} tone="amber" icon="⏳" onClick={() => set('status', f.status === 'created' ? '' : 'created')} active={f.status === 'created'} />
        <Kpi label="Failed / expired" value={shown.filter(r => r.status === 'failed' || r.status === 'cancelled').length} tone="red" icon="✖" onClick={() => set('status', f.status === 'failed' ? '' : 'failed')} active={f.status === 'failed'} />
        <Kpi label="Food" value={inr(sum(paid.filter(r => r.purpose === 'food'), r => r.amount))} icon="🍲" onClick={() => set('purpose', f.purpose === 'food' ? '' : 'food')} active={f.purpose === 'food'} />
        <Kpi label="Services & rides" value={inr(sum(paid.filter(r => r.purpose !== 'food'), r => r.amount))} icon="🛎️" />
      </KpiGrid>

      <FilterPanel active={active} onReset={() => setF(EMPTY)} extra={<>
        <button onClick={() => exportCsv('app-transactions.csv', [
          ['Created', r => r.createdAt], ['Resident', r => r.userName], ['Mobile', r => r.userMobile], ['For', r => r.purpose],
          ['Booked', r => (r.items?.length ? r.items.map(i => `${i.qty || 1}x ${i.name}`).join('; ') : r.remarks)], ['Amount', r => r.amount],
          ['Status', r => r.status], ['Order ID', r => r.orderId], ['Cashfree payment ID', r => r.cfPaymentId], ['UTR', r => r.bankRef], ['Mode', r => r.payMode], ['Paid at', r => r.paidAt],
        ], shown)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50">⬇ Export CSV</button>
        <button onClick={load} className="px-3 py-1.5 rounded-lg bg-brand-primary text-white text-sm font-semibold">↻ Refresh</button>
      </>}>
        <FilterField label="Search" className="col-span-2">
          <input value={f.q} onChange={e => set('q', e.target.value)} placeholder="Order id, name, mobile, UTR, item…" className={ctl} />
        </FilterField>
        <SelectFilter label="Status" value={f.status} onChange={v => set('status', v)} options={Object.entries(STATUS).map(([value, [label]]) => ({ value, label }))} />
        <SelectFilter label="For" value={f.purpose} onChange={v => set('purpose', v)} options={Object.entries(PURPOSE).map(([value, label]) => ({ value, label }))} />
        <DateFilter label="Date" value={f.date} onChange={v => set('date', v)} presets={['', 'today', 'yesterday', 'this_week', 'last_7', 'this_month', 'last_30', 'last_month', 'this_year', 'custom']} />
        <SelectFilter label="Mode" value={f.mode} onChange={v => set('mode', v)} options={[{ value: 'upi', label: 'UPI' }, { value: 'card', label: 'Card' }, { value: 'net', label: 'Net banking' }, { value: 'wallet', label: 'Wallet' }]} />
      </FilterPanel>
      <div className="text-xs text-slate-500">{loading ? 'Loading…' : `${shown.length} transaction(s) · ${inr(sum(paid, r => r.amount))} collected`}</div>
      <PagedTable columns={columns} rows={shown} rowKey="orderId" initialSort={{ key: 'createdAt', dir: 'desc' }} />
    </div>
  );
}
