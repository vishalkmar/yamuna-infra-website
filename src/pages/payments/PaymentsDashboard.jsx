import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import {
  Kpi, KpiGrid, Panel, BarList, TrendBars, FilterPanel, FilterField, SelectFilter, DateFilter, RangeFilter,
  ctl, inNumRange, PagedTable, Pill, Chips, PAYMENT_STATUS, moneyCompact,
} from '../../components/Dash';
import {
  presetRange, inRange, groupBy, series, forwardSeries, sum, inr, pct, shortDate, exportCsv, matchText, uniq,
  todayIST, daysBetween, weekdayOf, WEEKDAYS,
} from '../../lib/dash';
import { fmtDateTime } from '../../lib/format';

// Payments & Transactions command centre. Everything is derived from the
// installment ledger (every scheduled due + every recorded payment) and the
// online payment attempts, so it updates the moment a resident pays in the app
// or the office records a cash/cheque payment.

const D = { preset: '', from: '', to: '' };
const R = { min: '', max: '' };
const BASE = {
  q: '', paidOn: D, due: D, project: '', tower: '', resident: '', status: '', method: '', source: '', type: '',
  amount: R, overdueAge: '', timing: '', weekday: '', docket: '',
};
const SOURCE = { online: 'Online (app)', cash: 'Office (cash/cheque)', admin: 'Admin / booking' };
const ageOf = d => (!d ? '' : d <= 30 ? '1-30' : d <= 60 ? '31-60' : d <= 90 ? '61-90' : '90+');

export default function PaymentsDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('transactions');
  const [f, setF] = useState(BASE);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const pick = (k, v) => setF(p => ({ ...p, [k]: p[k] === v ? '' : v }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/admin/crm/property-book', { timeout: 60000 });
      setData(res.data);
    } catch (e) { toast.error(apiError(e, 'Could not load payments')); } finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const today = data?.today || todayIST();
  const props = data?.properties || [];
  const propBy = useMemo(() => new Map(props.map(p => [p.id, p])), [props]);
  const all = useMemo(() => (data?.installments || []).map(i => ({ ...i, docket: (propBy.get(i.propertyId)?.docketCount || 0) > 0 })), [data, propBy]);

  const rows = useMemo(() => {
    const rPaid = presetRange(f.paidOn.preset, f.paidOn, today);
    const rDue = presetRange(f.due.preset, f.due, today);
    return all.filter(i => {
      if (!matchText(i, f.q, ['residentName', 'residentMobile', 'residentEmail', 'property', 'projectName', 'label', 'txnId'])) return false;
      if (rPaid && !inRange(i.paidAt, rPaid)) return false;
      if (rDue && !inRange(i.dueDate, rDue)) return false;
      if (f.project && i.projectName !== f.project) return false;
      if (f.tower && i.tower !== f.tower) return false;
      if (f.resident && String(i.userId) !== f.resident) return false;
      if (f.status && i.status !== f.status) return false;
      if (f.method && (i.isPaid ? (i.method || 'Cash') : '') !== f.method) return false;
      if (f.source && i.source !== f.source) return false;
      if (f.type && (f.type === 'down') !== i.isDownpayment) return false;
      if (!inNumRange(i.amount, f.amount)) return false;
      if (f.overdueAge && ageOf(i.overdueDays) !== f.overdueAge) return false;
      if (f.timing === 'late' && !(i.isPaid && i.dueDate && i.paidAt && i.paidAt > i.dueDate)) return false;
      if (f.timing === 'ontime' && !(i.isPaid && i.dueDate && i.paidAt && i.paidAt <= i.dueDate)) return false;
      if (f.weekday && weekdayOf(i.paidAt) !== f.weekday) return false;
      if (f.docket && (f.docket === 'yes') !== i.docket) return false;
      return true;
    });
  }, [all, f, today]);

  const k = useMemo(() => {
    const paid = rows.filter(i => i.isPaid);
    const unpaid = rows.filter(i => !i.isPaid);
    const overdue = unpaid.filter(i => i.status === 'overdue');
    const amt = i => i.paidAmount ?? i.amount;
    const paidIn = p => sum(paid.filter(i => inRange(i.paidAt, presetRange(p, {}, today))), amt);
    const thisM = today.slice(0, 7);
    const scheduledThisMonth = rows.filter(i => String(i.dueDate || '').slice(0, 7) === thisM);
    const collectedAgainstThisMonth = scheduledThisMonth.filter(i => i.isPaid);
    const timed = paid.filter(i => i.dueDate && i.paidAt && !i.isDownpayment);
    const late = timed.filter(i => i.paidAt > i.dueDate);
    const online = paid.filter(i => i.source === 'online');
    const next = d => unpaid.filter(i => i.dueDate && i.dueDate >= today && daysBetween(i.dueDate, today) < d);
    const lastMonth = paidIn('last_month');
    const thisMonth = paidIn('this_month');
    const biggest = [...paid].sort((a, b) => amt(b) - amt(a))[0];
    const scheduled = sum(rows, i => i.amount);
    return {
      scheduled, count: rows.length,
      collected: sum(paid, amt), paidCount: paid.length,
      downCollected: sum(paid.filter(i => i.isDownpayment), amt),
      instCollected: sum(paid.filter(i => !i.isDownpayment), amt),
      outstanding: sum(unpaid, i => i.amount), pendingCount: unpaid.length,
      overdue: sum(overdue, i => i.amount), overdueCount: overdue.length,
      defaulters: new Set(overdue.map(i => i.userId)).size,
      avgOverdue: overdue.length ? Math.round(sum(overdue, i => i.overdueDays) / overdue.length) : 0,
      today: paidIn('today'), week: paidIn('this_week'), thisMonth, lastMonth, year: paidIn('this_year'),
      mom: lastMonth ? `${thisMonth >= lastMonth ? '▲' : '▼'} ${Math.abs(Math.round(((thisMonth - lastMonth) / lastMonth) * 100))}% vs last month` : 'no payments last month',
      expectedMonth: sum(scheduledThisMonth, i => i.amount),
      monthEfficiency: pct(sum(collectedAgainstThisMonth, amt), sum(scheduledThisMonth, i => i.amount)),
      next7: next(7), next30: next(30), dueToday: unpaid.filter(i => i.dueDate === today),
      lateFees: sum(unpaid, i => i.lateFee),
      avgTicket: paid.length ? sum(paid, amt) / paid.length : null,
      onTime: timed.length ? pct(timed.length - late.length, timed.length) : '—',
      avgDelay: late.length ? Math.round(sum(late, i => daysBetween(i.paidAt, i.dueDate)) / late.length) : 0,
      onlineShare: pct(sum(online, amt), sum(paid, amt)),
      forecast6: sum(unpaid.filter(i => i.dueDate && i.dueDate >= today && daysBetween(i.dueDate, today) < 183), i => i.amount),
      biggest,
      collectionPct: pct(sum(paid, amt), scheduled),
      payers: new Set(paid.map(i => i.userId)).size,
    };
  }, [rows, today]);

  const orders = data?.orders || [];
  const ok = useMemo(() => ({
    total: orders.length,
    paid: orders.filter(o => o.status === 'paid').length,
    failed: orders.filter(o => o.status === 'failed').length,
    pending: orders.filter(o => o.status === 'created').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  }), [orders]);

  const charts = useMemo(() => {
    const paid = rows.filter(i => i.isPaid);
    const amt = i => i.paidAmount ?? i.amount;
    return {
      daily: series(paid, i => i.paidAt, { by: 'day', days: 30, amount: amt, today }),
      monthly: series(paid, i => i.paidAt, { by: 'month', months: 12, amount: amt, today }),
      scheduled: series(rows, i => i.dueDate, { by: 'month', months: 12, amount: i => i.amount, today }),
      forecast: forwardSeries(rows.filter(i => !i.isPaid), i => i.dueDate, i => i.amount, 12, today),
      methods: groupBy(paid, i => i.method || 'Cash', { amount: amt }).map(x => ({ ...x, value: x.amount })),
      sources: groupBy(paid, i => SOURCE[i.source] || i.source || 'Admin', { amount: amt }).map(x => ({ ...x, value: x.amount })),
      projectsPaid: groupBy(paid, i => i.projectName || '—', { amount: amt }).map(x => ({ ...x, value: x.amount })),
      projectsDue: groupBy(rows.filter(i => !i.isPaid), i => i.projectName || '—', { amount: i => i.amount }).map(x => ({ ...x, value: x.amount })),
      ageing: ['1-30', '31-60', '61-90', '90+'].map(b => {
        const r = rows.filter(i => i.status === 'overdue' && ageOf(i.overdueDays) === b);
        return { label: `${b} days`, value: sum(r, i => i.amount), count: r.length };
      }),
      payers: groupBy(paid, i => i.residentName || i.residentMobile, { amount: amt }).map(x => ({ ...x, value: x.amount })).sort((a, b) => b.value - a.value),
      defaulters: groupBy(rows.filter(i => i.status === 'overdue'), i => i.residentName || i.residentMobile, { amount: i => i.amount }).map(x => ({ ...x, value: x.amount })).sort((a, b) => b.value - a.value),
      weekdays: WEEKDAYS.map(w => ({ label: w, value: paid.filter(i => weekdayOf(i.paidAt) === w).length })),
      status: ['paid', 'overdue', 'due_soon', 'upcoming'].map(s => ({ label: PAYMENT_STATUS[s].label, key: s, value: rows.filter(i => i.status === s).length })),
    };
  }, [rows, today]);

  const viewRows = view === 'transactions'
    ? rows.filter(i => i.isPaid)
    : view === 'dues' ? rows.filter(i => !i.isPaid) : rows;

  async function downloadStatement(propertyId) {
    try {
      const res = await api.get(`/admin/payment-plan/property/${propertyId}/statement.pdf`, { responseType: 'blob', timeout: 60000 });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `statement-${propertyId}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { toast.error(apiError(e, 'Could not download statement')); }
  }

  const resident = i => (
    <button onClick={() => navigate(`/users/${i.userId}`)} className="text-left">
      <div className="font-medium text-slate-800 hover:underline">{i.residentName || '—'}</div>
      <div className="text-xs text-slate-400">{i.residentMobile}</div>
    </button>
  );
  const columns = [
    { key: 'residentName', header: 'Resident', render: resident },
    { key: 'property', header: 'Property', render: i => <div><div>{i.property}</div><div className="text-xs text-slate-400">{[i.projectName, i.tower && `Tower ${i.tower}`].filter(Boolean).join(' · ')}</div></div> },
    { key: 'label', header: 'Towards', sort: i => i.seq, render: i => <span className={i.isDownpayment ? 'font-semibold text-violet-700' : ''}>{i.label}</span> },
    { key: 'dueDate', header: 'Due date', render: i => <span className="whitespace-nowrap">{shortDate(i.dueDate)}</span> },
    { key: 'amount', header: 'Due amt', align: 'right', render: i => inr(i.amount) },
    { key: 'status', header: 'Status', render: i => (
      <div>
        <Pill tone={PAYMENT_STATUS[i.status]?.tone}>{PAYMENT_STATUS[i.status]?.label || i.status}</Pill>
        {i.status === 'overdue' && <div className="text-[11px] text-rose-500 mt-0.5">{i.overdueDays}d late{i.lateFee ? ` · fee ${inr(i.lateFee)}` : ''}</div>}
        {i.status === 'due_soon' && <div className="text-[11px] text-amber-600 mt-0.5">in {i.daysToDue} day(s)</div>}
        {i.isPaid && i.dueDate && i.paidAt > i.dueDate && <div className="text-[11px] text-amber-600 mt-0.5">paid {daysBetween(i.paidAt, i.dueDate)}d late</div>}
      </div>
    ) },
    { key: 'paidAt', header: 'Paid on', render: i => (i.isPaid ? <span className="whitespace-nowrap">{shortDate(i.paidAt)}</span> : '—') },
    { key: 'paidAmount', header: 'Received', align: 'right', render: i => (i.isPaid ? <b className="text-emerald-700">{inr(i.paidAmount ?? i.amount)}</b> : '—') },
    { key: 'method', header: 'Mode · Via', render: i => (i.isPaid ? <div><div>{i.method || 'Cash'}</div><div className="text-[11px] text-slate-400">{SOURCE[i.source] || i.source || '—'}</div></div> : '—') },
    { key: 'txnId', header: 'Receipt / Ref', render: i => (i.isPaid ? <span className="font-mono text-[11px]">{i.txnId || `INST-${i.id}`}</span> : '—') },
    { key: 'docket', header: 'Docket', render: i => (i.docket ? <Pill tone="green">📘</Pill> : <Pill tone="amber">Missing</Pill>) },
    { key: 'go', header: '', noSort: true, render: i => (
      <div className="flex flex-col items-end gap-0.5 text-xs whitespace-nowrap">
        <button onClick={() => navigate(`/payment-plan/${i.propertyId}`)} className="text-brand-primary font-semibold hover:underline">Plan →</button>
        <button onClick={() => downloadStatement(i.propertyId)} className="text-slate-500 hover:underline">Statement</button>
      </div>
    ) },
  ];

  function exportRows() {
    exportCsv(`payments-${view}-${today}.csv`, [
      { header: 'Resident', value: i => i.residentName }, { header: 'Mobile', value: i => i.residentMobile },
      { header: 'Property', value: i => i.property }, { header: 'Project', value: i => i.projectName }, { header: 'Tower', value: i => i.tower },
      { header: 'Towards', value: i => i.label }, { header: 'Due date', value: i => i.dueDate }, { header: 'Due amount', value: i => i.amount },
      { header: 'Status', value: i => PAYMENT_STATUS[i.status]?.label || i.status }, { header: 'Days overdue', value: i => i.overdueDays },
      { header: 'Late fee', value: i => i.lateFee }, { header: 'Paid on', value: i => i.paidAt },
      { header: 'Received', value: i => (i.isPaid ? (i.paidAmount ?? i.amount) : '') }, { header: 'Mode', value: i => (i.isPaid ? i.method || 'Cash' : '') },
      { header: 'Via', value: i => (i.isPaid ? SOURCE[i.source] || i.source : '') }, { header: 'Reference', value: i => (i.isPaid ? i.txnId || `INST-${i.id}` : '') },
    ], viewRows);
  }

  const activeCount = Object.keys(BASE).reduce((n, key) => n + (JSON.stringify(f[key]) !== JSON.stringify(BASE[key]) ? 1 : 0), 0);
  const residentOpts = uniq(all.map(i => `${i.userId}::${i.residentName || i.residentMobile}`)).map(x => { const [value, label] = x.split('::'); return { value, label }; });
  const quickPaid = p => set('paidOn', f.paidOn.preset === p ? D : { ...D, preset: p });

  return (
    <div>
      <PageHeader title="💳 Payments & Transactions" subtitle="Every rupee scheduled, received and pending — live from the app and the office">
        <button onClick={load} className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">↻ Refresh</button>
      </PageHeader>

      {loading && !data ? <div className="text-slate-400 py-10 text-center">Loading payments…</div> : (
        <>
          <KpiGrid>
            <Kpi icon="📄" label="Total scheduled" value={moneyCompact(k.scheduled)} sub={`${k.count} line(s) incl. down payments`} />
            <Kpi icon="💰" label="Collected" value={moneyCompact(k.collected)} tone="good" sub={`${k.collectionPct} · ${k.paidCount} payment(s)`} onClick={() => setView('transactions')} active={view === 'transactions'} />
            <Kpi icon="⏳" label="Still to come" value={moneyCompact(k.outstanding)} tone="info" sub={`${k.pendingCount} installment(s)`} onClick={() => setView('dues')} active={view === 'dues'} />
            <Kpi icon="🚨" label="Overdue" value={moneyCompact(k.overdue)} tone="bad" sub={`${k.overdueCount} inst · avg ${k.avgOverdue}d late`} onClick={() => { setView('dues'); pick('status', 'overdue'); }} active={f.status === 'overdue'} />
            <Kpi icon="👤" label="Defaulters" value={k.defaulters} tone={k.defaulters ? 'bad' : 'muted'} />
            <Kpi icon="⚠️" label="Late fees accruing" value={moneyCompact(k.lateFees)} tone={k.lateFees ? 'warn' : 'muted'} />
            <Kpi icon="🟢" label="Received today" value={moneyCompact(k.today)} tone="good" onClick={() => quickPaid('today')} active={f.paidOn.preset === 'today'} />
            <Kpi icon="🗓️" label="This week" value={moneyCompact(k.week)} tone="good" onClick={() => quickPaid('this_week')} active={f.paidOn.preset === 'this_week'} />
            <Kpi icon="📅" label="This month" value={moneyCompact(k.thisMonth)} tone="good" sub={k.mom} onClick={() => quickPaid('this_month')} active={f.paidOn.preset === 'this_month'} />
            <Kpi icon="⏮️" label="Last month" value={moneyCompact(k.lastMonth)} onClick={() => quickPaid('last_month')} active={f.paidOn.preset === 'last_month'} />
            <Kpi icon="📆" label="This year" value={moneyCompact(k.year)} onClick={() => quickPaid('this_year')} active={f.paidOn.preset === 'this_year'} />
            <Kpi icon="🎯" label="Expected this month" value={moneyCompact(k.expectedMonth)} sub={`${k.monthEfficiency} already collected`} />
            <Kpi icon="📌" label="Due today" value={moneyCompact(sum(k.dueToday, i => i.amount))} tone="warn" sub={`${k.dueToday.length} installment(s)`} />
            <Kpi icon="⏰" label="Due next 7 days" value={moneyCompact(sum(k.next7, i => i.amount))} tone="warn" sub={`${k.next7.length} installment(s)`} onClick={() => { setView('dues'); pick('status', 'due_soon'); }} active={f.status === 'due_soon'} />
            <Kpi icon="🗓️" label="Due next 30 days" value={moneyCompact(sum(k.next30, i => i.amount))} sub={`${k.next30.length} installment(s)`} />
            <Kpi icon="🔮" label="Next 6 months inflow" value={moneyCompact(k.forecast6)} tone="info" />
            <Kpi icon="🔖" label="Down payments received" value={moneyCompact(k.downCollected)} onClick={() => pick('type', 'down')} active={f.type === 'down'} />
            <Kpi icon="🔁" label="Installments received" value={moneyCompact(k.instCollected)} onClick={() => pick('type', 'inst')} active={f.type === 'inst'} />
            <Kpi icon="🧮" label="Average payment" value={k.avgTicket != null ? inr(k.avgTicket) : '—'} sub={`${k.payers} paying resident(s)`} />
            <Kpi icon="🏆" label="Largest payment" value={k.biggest ? moneyCompact(k.biggest.paidAmount ?? k.biggest.amount) : '—'} sub={k.biggest ? `${k.biggest.residentName} · ${shortDate(k.biggest.paidAt)}` : ''} />
            <Kpi icon="✅" label="On-time rate" value={k.onTime} sub={k.avgDelay ? `late ones avg ${k.avgDelay} days` : ''} onClick={() => pick('timing', 'late')} active={f.timing === 'late'} />
            <Kpi icon="📱" label="Paid online (app)" value={k.onlineShare} sub="share of amount" onClick={() => pick('source', 'online')} active={f.source === 'online'} />
            <Kpi icon="🌐" label="Online attempts" value={ok.total} sub={`${ok.paid} paid · ${ok.failed} failed · ${ok.pending} open`} onClick={() => setView('online')} active={view === 'online'} />
            <Kpi icon="❌" label="Failed / abandoned" value={ok.failed + ok.cancelled + ok.pending} tone={ok.failed ? 'bad' : 'muted'} sub="follow up with these residents" onClick={() => setView('online')} />
          </KpiGrid>

          <div className="grid lg:grid-cols-3 gap-4 mt-4">
            <Panel title="Money received — last 30 days" className="lg:col-span-2"><TrendBars points={charts.daily} metric="amount" format={v => moneyCompact(v)} /></Panel>
            <Panel title="Installment status" subtitle="Click to filter">
              <BarList items={charts.status} onPick={l => pick('status', charts.status.find(s => s.label === l)?.key)} picked={PAYMENT_STATUS[f.status]?.label} />
            </Panel>
            <Panel title="Received by month (last 12)" className="lg:col-span-2"><TrendBars points={charts.monthly} metric="amount" format={v => moneyCompact(v)} /></Panel>
            <Panel title="Overdue ageing" subtitle="Click to filter">
              <BarList items={charts.ageing} valueLabel={(v, i) => `${moneyCompact(v)} · ${i.count}`} color="bg-rose-400" onPick={l => pick('overdueAge', l.replace(' days', ''))} picked={f.overdueAge ? `${f.overdueAge} days` : ''} />
            </Panel>
            <Panel title="Scheduled by due month (last 12)" subtitle="Compare with received above" className="lg:col-span-2"><TrendBars points={charts.scheduled} metric="amount" format={v => moneyCompact(v)} /></Panel>
            <Panel title="Payment modes" subtitle="Click to filter">
              <BarList items={charts.methods} valueLabel={v => moneyCompact(v)} color="bg-emerald-400" onPick={v => pick('method', v)} picked={f.method} empty="No payments yet" />
            </Panel>
            <Panel title="Upcoming inflow — next 12 months" className="lg:col-span-2"><TrendBars points={charts.forecast} metric="amount" format={v => moneyCompact(v)} /></Panel>
            <Panel title="Where money came from">
              <BarList items={charts.sources} valueLabel={v => moneyCompact(v)} color="bg-sky-400" empty="No payments yet" />
            </Panel>
            <Panel title="Collected by project" subtitle="Click to filter">
              <BarList items={charts.projectsPaid} valueLabel={v => moneyCompact(v)} onPick={v => pick('project', v)} picked={f.project} empty="No payments yet" />
            </Panel>
            <Panel title="Pending by project">
              <BarList items={charts.projectsDue} valueLabel={v => moneyCompact(v)} color="bg-sky-400" onPick={v => pick('project', v)} picked={f.project} />
            </Panel>
            <Panel title="Payments by weekday">
              <BarList items={charts.weekdays} color="bg-violet-400" max={7} onPick={v => pick('weekday', v)} picked={f.weekday} />
            </Panel>
            <Panel title="Top payers">
              <BarList items={charts.payers} valueLabel={v => moneyCompact(v)} color="bg-emerald-400" empty="No payments yet" />
            </Panel>
            <Panel title="Top defaulters">
              <BarList items={charts.defaulters} valueLabel={v => moneyCompact(v)} color="bg-rose-400" empty="Nobody overdue 🎉" />
            </Panel>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-5 mb-3">
            <Chips value={view} onChange={setView} options={[
              { key: 'transactions', label: '🧾 Transactions (received)', count: rows.filter(i => i.isPaid).length },
              { key: 'dues', label: '⏳ Dues (pending)', count: rows.filter(i => !i.isPaid).length },
              { key: 'all', label: '📋 Full ledger', count: rows.length },
              { key: 'online', label: '🌐 Online attempts', count: orders.length },
            ]} />
          </div>

          {view !== 'online' && (
            <FilterPanel active={activeCount} onReset={() => setF(BASE)} extra={<button onClick={exportRows} className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">⬇ Export CSV</button>}>
              <FilterField label="Search" className="col-span-2">
                <input value={f.q} onChange={e => set('q', e.target.value)} placeholder="Resident, phone, flat, project, receipt / txn id…" className={ctl} />
              </FilterField>
              <DateFilter label="Paid on" value={f.paidOn} onChange={v => set('paidOn', v)} />
              <DateFilter label="Due date" value={f.due} onChange={v => set('due', v)} />
              <SelectFilter label="Status" value={f.status} onChange={v => set('status', v)} options={['paid', 'overdue', 'due_soon', 'upcoming'].map(s => ({ value: s, label: PAYMENT_STATUS[s].label }))} />
              <SelectFilter label="Resident" value={f.resident} onChange={v => set('resident', v)} options={residentOpts} />
              <SelectFilter label="Project" value={f.project} onChange={v => set('project', v)} options={uniq(all.map(i => i.projectName))} />
              <SelectFilter label="Tower" value={f.tower} onChange={v => set('tower', v)} options={uniq(all.map(i => i.tower))} />
              <SelectFilter label="Payment mode" value={f.method} onChange={v => set('method', v)} options={uniq(all.filter(i => i.isPaid).map(i => i.method || 'Cash'))} />
              <SelectFilter label="Paid via" value={f.source} onChange={v => set('source', v)} options={uniq(all.map(i => i.source)).map(s => ({ value: s, label: SOURCE[s] || s }))} />
              <SelectFilter label="Type" value={f.type} onChange={v => set('type', v)} options={[{ value: 'down', label: 'Down payment' }, { value: 'inst', label: 'Installment' }]} />
              <SelectFilter label="Overdue age" value={f.overdueAge} onChange={v => set('overdueAge', v)} options={['1-30', '31-60', '61-90', '90+'].map(b => ({ value: b, label: `${b} days` }))} />
              <SelectFilter label="Punctuality" value={f.timing} onChange={v => set('timing', v)} options={[{ value: 'ontime', label: 'Paid on time' }, { value: 'late', label: 'Paid late' }]} />
              <SelectFilter label="Paid on weekday" value={f.weekday} onChange={v => set('weekday', v)} options={WEEKDAYS} />
              <SelectFilter label="Booking docket" value={f.docket} onChange={v => set('docket', v)} options={[{ value: 'yes', label: 'Uploaded' }, { value: 'no', label: 'Missing' }]} />
              <RangeFilter label="Amount ₹" value={f.amount} onChange={v => set('amount', v)} />
            </FilterPanel>
          )}

          {view === 'online' ? (
            <PagedTable
              rows={orders}
              empty="No online payment attempts yet — they appear when residents tap “Pay now” in the app."
              initialSort={{ key: 'createdAt', dir: 'desc' }}
              columns={[
                { key: 'orderId', header: 'Order', render: o => <span className="font-mono text-xs">{o.orderId}</span> },
                { key: 'residentName', header: 'Resident', render: o => resident(o) },
                { key: 'installmentLabel', header: 'For', render: o => o.installmentLabel || '—' },
                { key: 'amount', header: 'Amount', align: 'right', render: o => inr(o.amount) },
                { key: 'status', header: 'Status', render: o => <Pill tone={{ paid: 'green', failed: 'red', created: 'amber', cancelled: 'slate' }[o.status]}>{o.status === 'created' ? 'Started, not paid' : o.status}</Pill> },
                { key: 'createdAt', header: 'Started', render: o => fmtDateTime(o.createdAt) },
                { key: 'paidAt', header: 'Paid at', render: o => (o.paidAt ? fmtDateTime(o.paidAt) : '—') },
              ]}
            />
          ) : (
            <PagedTable columns={columns} rows={viewRows} pageSize={30} initialSort={view === 'transactions' ? { key: 'paidAt', dir: 'desc' } : { key: 'dueDate', dir: 'asc' }} empty="Nothing matches these filters." />
          )}
        </>
      )}
    </div>
  );
}
