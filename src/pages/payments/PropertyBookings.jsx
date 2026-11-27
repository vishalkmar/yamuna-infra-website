import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import {
  Kpi, KpiGrid, Panel, BarList, TrendBars, Progress, FilterPanel, FilterField, SelectFilter, DateFilter, RangeFilter,
  ctl, inNumRange, PagedTable, Pill, Chips, PAYMENT_STATUS, moneyCompact,
} from '../../components/Dash';
import {
  presetRange, inRange, groupBy, series, sum, inr, pct, shortDate, exportCsv, matchText, uniq, todayIST,
} from '../../lib/dash';

// Property Bookings: one row per booked flat/plot — who booked which unit on
// which floor, when, the deal (agreement, down payment, EMI × tenure), first
// and last payment, dues, docket and construction — plus agent bookings still
// waiting to be converted into a resident.

const D = { preset: '', from: '', to: '' };
const R = { min: '', max: '' };
const BASE = {
  q: '', booked: D, lastPaid: D, nextDue: D, project: '', tower: '', floor: '', ptype: '', status: '', source: '',
  agent: '', docket: '', plan: '', freq: '', tenure: '', progress: '', agreement: R, down: R, emi: R, construction: '',
};
const tenureBand = m => (!m ? 'none' : m <= 12 ? '≤ 1 yr' : m <= 36 ? '1–3 yrs' : m <= 60 ? '3–5 yrs' : m <= 120 ? '5–10 yrs' : '10+ yrs');
const progBand = (p, has) => (!has ? 'none' : p >= 100 ? '100' : p >= 75 ? '75-99' : p >= 50 ? '50-74' : p >= 25 ? '25-49' : '0-24');

export default function PropertyBookings() {
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('bookings');
  const [f, setF] = useState(BASE);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const pick = (k, v) => setF(p => ({ ...p, [k]: p[k] === v ? '' : v }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/admin/crm/property-book', { timeout: 60000 });
      setData(res.data);
    } catch (e) { toast.error(apiError(e, 'Could not load bookings')); } finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const today = data?.today || todayIST();
  const props = data?.properties || [];
  const pending = data?.pendingAgentBookings || [];

  const rows = useMemo(() => {
    const rB = presetRange(f.booked.preset, f.booked, today);
    const rL = presetRange(f.lastPaid.preset, f.lastPaid, today);
    const rN = presetRange(f.nextDue.preset, f.nextDue, today);
    return props.filter(p => {
      if (!matchText(p, f.q, ['residentName', 'residentMobile', 'residentEmail', 'flatNo', 'projectName', 'tower', 'label', 'agentName'])) return false;
      if (rB && !inRange(p.bookedAt, rB)) return false;
      if (rL && !inRange(p.lastPaymentAt, rL)) return false;
      if (rN && !inRange(p.nextDueDate, rN)) return false;
      if (f.project && p.projectName !== f.project) return false;
      if (f.tower && p.tower !== f.tower) return false;
      if (f.floor && String(p.floor) !== f.floor) return false;
      if (f.ptype && p.propertyType !== f.ptype) return false;
      if (f.status && p.status !== f.status) return false;
      if (f.source && p.source !== f.source) return false;
      if (f.agent && p.agentName !== f.agent) return false;
      if (f.docket && (f.docket === 'yes') !== (p.docketCount > 0)) return false;
      if (f.plan && (f.plan === 'yes') !== p.hasPlan) return false;
      if (f.freq && p.frequency !== f.freq) return false;
      if (f.tenure && tenureBand(p.tenureMonths) !== f.tenure) return false;
      if (f.progress && progBand(p.progressPct, p.hasPlan) !== f.progress) return false;
      if (!inNumRange(p.agreement, f.agreement)) return false;
      if (!inNumRange(p.downpayment, f.down)) return false;
      if ((f.emi.min !== '' || f.emi.max !== '') && !inNumRange(p.installmentAmount ?? 0, f.emi)) return false;
      if (f.construction === 'done' && p.workPercent < 100) return false;
      if (f.construction === 'progress' && !(p.workPercent > 0 && p.workPercent < 100)) return false;
      if (f.construction === 'notstarted' && p.workPercent > 0) return false;
      return true;
    });
  }, [props, f, today]);

  const k = useMemo(() => {
    const withPlan = rows.filter(p => p.hasPlan);
    const agreement = sum(rows, p => p.agreement);
    const area = sum(rows.filter(p => p.areaSqft), p => p.areaSqft);
    const areaWithValue = rows.filter(p => p.areaSqft && p.agreement);
    const bookedIn = pr => rows.filter(p => inRange(p.bookedAt, presetRange(pr, {}, today))).length;
    const year = today.slice(0, 4);
    return {
      total: rows.length,
      residents: new Set(rows.map(p => p.userId)).size,
      today: bookedIn('today'), week: bookedIn('this_week'), month: bookedIn('this_month'), year: bookedIn('this_year'),
      agreement, avgTicket: withPlan.length ? agreement / withPlan.length : null,
      down: sum(rows, p => p.downpayment),
      downPct: pct(sum(rows, p => p.downpayment), agreement),
      monthlyEmi: sum(withPlan.filter(p => p.status !== 'completed'), p => (p.installmentAmount || 0) / (p.gapMonths || 1)),
      paid: sum(rows, p => p.paid), outstanding: sum(rows, p => p.outstanding),
      active: rows.filter(p => ['on_track', 'due_soon', 'overdue'].includes(p.status)).length,
      overdue: rows.filter(p => p.status === 'overdue').length,
      completed: rows.filter(p => p.status === 'completed').length,
      noPlan: rows.filter(p => !p.hasPlan).length,
      noDocket: rows.filter(p => !p.docketCount).length,
      viaAgent: rows.filter(p => p.source === 'agent').length,
      avgTenure: withPlan.length ? Math.round(sum(withPlan, p => p.tenureMonths) / withPlan.length) : null,
      area, ppsf: areaWithValue.length ? sum(areaWithValue, p => p.agreement) / sum(areaWithValue, p => p.areaSqft) : null,
      endingThisYear: rows.filter(p => String(p.endDate || '').startsWith(year)).length,
      noFirstPayment: withPlan.filter(p => !p.firstInstallmentPaidAt).length,
      construction: rows.length ? Math.round(sum(rows, p => p.workPercent) / rows.length) : 0,
    };
  }, [rows, today]);

  const charts = useMemo(() => ({
    monthly: series(rows, p => p.bookedAt, { by: 'month', months: 12, amount: p => p.agreement, today }),
    projects: groupBy(rows, p => p.projectName || '—', { amount: p => p.agreement }),
    floors: groupBy(rows, p => (p.floor ? `Floor ${p.floor}` : '—')),
    types: groupBy(rows, p => p.propertyType || p.label || '—'),
    status: ['overdue', 'due_soon', 'on_track', 'completed', 'no_plan'].map(s => ({ key: s, label: PAYMENT_STATUS[s].label, value: rows.filter(p => p.status === s).length })),
    agents: groupBy(rows.filter(p => p.agentName), p => p.agentName, { amount: p => p.agreement }),
    tenure: groupBy(rows.filter(p => p.hasPlan), p => tenureBand(p.tenureMonths)),
  }), [rows, today]);

  const activeCount = Object.keys(BASE).reduce((n, key) => n + (JSON.stringify(f[key]) !== JSON.stringify(BASE[key]) ? 1 : 0), 0);

  const columns = [
    { key: 'flatNo', header: 'Unit', render: p => (
      <div className="min-w-[130px]">
        <div className="font-semibold text-slate-800">{p.flatNo || p.label || 'Property'}</div>
        <div className="text-xs text-slate-500">{[p.projectName, p.tower && `Tower ${p.tower}`, p.floor && `Floor ${p.floor}`].filter(Boolean).join(' · ')}</div>
        <div className="text-[11px] text-slate-400">{[p.propertyType, p.areaSqft && `${p.areaSqft} sq.ft`].filter(Boolean).join(' · ')}</div>
      </div>
    ) },
    { key: 'residentName', header: 'Booked by', render: p => (
      <button onClick={() => navigate(`/users/${p.userId}`)} className="text-left">
        <div className="font-medium text-slate-800 hover:underline">{p.residentName}</div>
        <div className="text-xs text-slate-400">{p.residentMobile}</div>
        {p.agentName && <div className="text-[11px] text-violet-600">via {p.agentName}</div>}
      </button>
    ) },
    { key: 'bookedAt', header: 'Booked on', render: p => <span className="whitespace-nowrap">{shortDate(p.bookedAt)}</span> },
    { key: 'agreement', header: 'Deal', align: 'right', render: p => (p.hasPlan ? (
      <div className="whitespace-nowrap"><div className="font-semibold">{moneyCompact(p.agreement)}</div><div className="text-[11px] text-slate-400">down {moneyCompact(p.downpayment)}</div></div>
    ) : <Pill>No plan</Pill>) },
    { key: 'installmentAmount', header: 'EMI × tenure', render: p => (p.hasPlan && p.installmentCount ? (
      <div className="whitespace-nowrap"><div>{inr(p.installmentAmount)} <span className="text-xs text-slate-400">{p.frequency || ''}</span></div>
        <div className="text-[11px] text-slate-400">{p.installmentCount} inst · {p.tenureMonths} months</div></div>
    ) : '—') },
    { key: 'firstPaymentAt', header: 'First payment', render: p => <span className="whitespace-nowrap">{shortDate(p.firstPaymentAt)}</span> },
    { key: 'lastPaymentAt', header: 'Last payment', render: p => (p.lastPaymentAt ? (
      <div className="whitespace-nowrap"><div>{shortDate(p.lastPaymentAt)}</div><div className="text-[11px] text-slate-400">{inr(p.lastPaymentAmount)} · {p.lastPaymentMethod}</div></div>
    ) : '—') },
    { key: 'paid', header: 'Paid', align: 'right', render: p => (p.hasPlan ? (
      <div className="min-w-[90px]"><div>{moneyCompact(p.paid)} <span className="text-[11px] text-slate-400">{p.progressPct}%</span></div><Progress value={p.progressPct} className="mt-1" /></div>
    ) : '—') },
    { key: 'outstanding', header: 'Balance', align: 'right', render: p => (p.hasPlan ? <b>{moneyCompact(p.outstanding)}</b> : '—') },
    { key: 'nextDueDate', header: 'Next due', render: p => (p.nextDueDate ? (
      <div className="whitespace-nowrap"><div className={p.nextDueDate < today ? 'text-rose-600 font-medium' : ''}>{shortDate(p.nextDueDate)}</div><div className="text-[11px] text-slate-400">{inr(p.nextDueAmount)}</div></div>
    ) : '—') },
    { key: 'status', header: 'Status', render: p => (
      <div><Pill tone={PAYMENT_STATUS[p.status]?.tone}>{PAYMENT_STATUS[p.status]?.label}</Pill>
        {p.overdueCount > 0 && <div className="text-[11px] text-rose-500 mt-0.5">{p.overdueCount} · {moneyCompact(p.overdueAmount)} · {p.maxOverdueDays}d</div>}</div>
    ) },
    { key: 'docketCount', header: 'Docket', render: p => (p.docketCount ? <Pill tone="green">📘 {p.docketCount}</Pill> : <Pill tone="amber">Missing</Pill>) },
    { key: 'workPercent', header: 'Build', align: 'right', render: p => <span className="text-xs">{p.workPercent}%</span> },
    { key: 'go', header: '', noSort: true, render: p => (
      <div className="flex flex-col items-end gap-0.5 text-xs whitespace-nowrap">
        <button onClick={() => navigate(`/payment-plan/${p.id}`)} className="text-brand-primary font-semibold hover:underline">Plan →</button>
        <button onClick={() => navigate(`/users/${p.userId}?tab=payments`)} className="text-slate-500 hover:underline">Resident</button>
      </div>
    ) },
  ];

  function exportRows() {
    exportCsv(`property-bookings-${today}.csv`, [
      { header: 'Unit', value: p => p.flatNo }, { header: 'Project', value: p => p.projectName }, { header: 'Tower', value: p => p.tower },
      { header: 'Floor', value: p => p.floor }, { header: 'Type', value: p => p.propertyType }, { header: 'Area sq.ft', value: p => p.areaSqft },
      { header: 'Booked by', value: p => p.residentName }, { header: 'Mobile', value: p => p.residentMobile }, { header: 'Agent', value: p => p.agentName },
      { header: 'Booked on', value: p => p.bookedAt }, { header: 'Agreement', value: p => p.agreement }, { header: 'Down payment', value: p => p.downpayment },
      { header: 'EMI', value: p => p.installmentAmount }, { header: 'Installments', value: p => p.installmentCount }, { header: 'Frequency', value: p => p.frequency },
      { header: 'Tenure months', value: p => p.tenureMonths }, { header: 'First payment', value: p => p.firstPaymentAt }, { header: 'Last payment', value: p => p.lastPaymentAt },
      { header: 'Paid', value: p => p.paid }, { header: 'Balance', value: p => p.outstanding }, { header: 'Progress %', value: p => p.progressPct },
      { header: 'Next due', value: p => p.nextDueDate }, { header: 'Next due amount', value: p => p.nextDueAmount },
      { header: 'Status', value: p => PAYMENT_STATUS[p.status]?.label }, { header: 'Overdue amount', value: p => p.overdueAmount },
      { header: 'Dockets', value: p => p.docketCount }, { header: 'Construction %', value: p => p.workPercent },
    ], rows);
  }
  const quickBooked = pr => set('booked', f.booked.preset === pr ? D : { ...D, preset: pr });

  return (
    <div>
      <PageHeader title="🏘️ Property Bookings" subtitle="Every booked unit — who, which flat & floor, the deal, the payment journey and the docket">
        <button onClick={load} className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">↻ Refresh</button>
      </PageHeader>

      {loading && !data ? <div className="text-slate-400 py-10 text-center">Loading bookings…</div> : (
        <>
          <KpiGrid>
            <Kpi icon="🏘️" label="Total bookings" value={k.total} sub={`${k.residents} buyer(s)`} />
            <Kpi icon="📌" label="Booked today" value={k.today} onClick={() => quickBooked('today')} active={f.booked.preset === 'today'} />
            <Kpi icon="🗓️" label="This week" value={k.week} onClick={() => quickBooked('this_week')} active={f.booked.preset === 'this_week'} />
            <Kpi icon="📅" label="This month" value={k.month} onClick={() => quickBooked('this_month')} active={f.booked.preset === 'this_month'} />
            <Kpi icon="📆" label="This year" value={k.year} onClick={() => quickBooked('this_year')} active={f.booked.preset === 'this_year'} />
            <Kpi icon="📄" label="Total deal value" value={moneyCompact(k.agreement)} sub={k.avgTicket ? `avg ${moneyCompact(k.avgTicket)}` : ''} />
            <Kpi icon="🔖" label="Down payments" value={moneyCompact(k.down)} sub={`${k.downPct} of deal value`} />
            <Kpi icon="🔁" label="Monthly EMI inflow" value={moneyCompact(k.monthlyEmi)} tone="info" sub="active plans, per month" />
            <Kpi icon="💰" label="Collected" value={moneyCompact(k.paid)} tone="good" sub={pct(k.paid, k.agreement)} />
            <Kpi icon="⏳" label="Balance receivable" value={moneyCompact(k.outstanding)} tone="info" />
            <Kpi icon="▶️" label="Active plans" value={k.active} />
            <Kpi icon="🚨" label="Overdue bookings" value={k.overdue} tone={k.overdue ? 'bad' : 'muted'} onClick={() => pick('status', 'overdue')} active={f.status === 'overdue'} />
            <Kpi icon="🏁" label="Fully paid" value={k.completed} tone="good" onClick={() => pick('status', 'completed')} active={f.status === 'completed'} />
            <Kpi icon="➖" label="No payment plan" value={k.noPlan} tone={k.noPlan ? 'warn' : 'muted'} sub="set up EMI schedule" onClick={() => pick('plan', 'no')} active={f.plan === 'no'} />
            <Kpi icon="📘" label="Docket missing" value={k.noDocket} tone={k.noDocket ? 'warn' : 'muted'} onClick={() => pick('docket', 'no')} active={f.docket === 'no'} />
            <Kpi icon="🤝" label="Via agents" value={k.viaAgent} onClick={() => pick('source', 'agent')} active={f.source === 'agent'} />
            <Kpi icon="🕓" label="Agent bookings to convert" value={pending.length} tone={pending.length ? 'warn' : 'muted'} sub="approved, no resident yet" onClick={() => setView('agent')} active={view === 'agent'} />
            <Kpi icon="⏱️" label="Average tenure" value={k.avgTenure ? `${k.avgTenure} mo` : '—'} />
            <Kpi icon="📐" label="Area booked" value={k.area ? `${Math.round(k.area).toLocaleString('en-IN')} sq.ft` : '—'} sub={k.ppsf ? `avg ${inr(k.ppsf)}/sq.ft` : ''} />
            <Kpi icon="🗓️" label="Plans ending this year" value={k.endingThisYear} />
            <Kpi icon="⌛" label="No installment paid yet" value={k.noFirstPayment} tone={k.noFirstPayment ? 'warn' : 'muted'} sub="only down payment so far" />
            <Kpi icon="🏗️" label="Avg construction" value={`${k.construction}%`} />
          </KpiGrid>

          <div className="grid lg:grid-cols-3 gap-4 mt-4">
            <Panel title="Bookings by month (last 12)" className="lg:col-span-2"><TrendBars points={charts.monthly} /></Panel>
            <Panel title="Payment status" subtitle="Click to filter">
              <BarList items={charts.status} onPick={l => pick('status', charts.status.find(s => s.label === l)?.key)} picked={PAYMENT_STATUS[f.status]?.label} />
            </Panel>
            <Panel title="Deal value by month (last 12)" className="lg:col-span-2"><TrendBars points={charts.monthly} metric="amount" format={v => moneyCompact(v)} /></Panel>
            <Panel title="By project" subtitle="Click to filter">
              <BarList items={charts.projects} valueLabel={(v, i) => `${v} · ${moneyCompact(i.amount)}`} onPick={v => pick('project', v)} picked={f.project} />
            </Panel>
            <Panel title="By floor" subtitle="Click to filter">
              <BarList items={charts.floors} onPick={v => pick('floor', v.replace('Floor ', ''))} picked={f.floor ? `Floor ${f.floor}` : ''} color="bg-sky-400" />
            </Panel>
            <Panel title="By unit type"><BarList items={charts.types} color="bg-violet-400" /></Panel>
            <Panel title="Tenure"><BarList items={charts.tenure} color="bg-amber-400" onPick={v => pick('tenure', v)} picked={f.tenure} /></Panel>
            <Panel title="Bookings by agent" subtitle="Click to filter">
              <BarList items={charts.agents} valueLabel={(v, i) => `${v} · ${moneyCompact(i.amount)}`} onPick={v => pick('agent', v)} picked={f.agent} empty="No agent bookings linked yet" color="bg-teal-400" />
            </Panel>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-5 mb-3">
            <Chips value={view} onChange={setView} options={[{ key: 'bookings', label: '🏘️ Booked units', count: rows.length }, { key: 'agent', label: '🤝 Agent bookings to convert', count: pending.length }]} />
          </div>

          {view === 'bookings' ? (
            <>
              <FilterPanel active={activeCount} onReset={() => setF(BASE)} extra={<button onClick={exportRows} className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">⬇ Export CSV</button>}>
                <FilterField label="Search" className="col-span-2">
                  <input value={f.q} onChange={e => set('q', e.target.value)} placeholder="Buyer, phone, flat no, project, agent…" className={ctl} />
                </FilterField>
                <DateFilter label="Booked on" value={f.booked} onChange={v => set('booked', v)} />
                <DateFilter label="Last payment" value={f.lastPaid} onChange={v => set('lastPaid', v)} />
                <DateFilter label="Next due" value={f.nextDue} onChange={v => set('nextDue', v)} />
                <SelectFilter label="Project" value={f.project} onChange={v => set('project', v)} options={uniq(props.map(p => p.projectName))} />
                <SelectFilter label="Tower" value={f.tower} onChange={v => set('tower', v)} options={uniq(props.map(p => p.tower))} />
                <SelectFilter label="Floor" value={f.floor} onChange={v => set('floor', v)} options={uniq(props.map(p => p.floor && String(p.floor)))} />
                <SelectFilter label="Unit type" value={f.ptype} onChange={v => set('ptype', v)} options={uniq(props.map(p => p.propertyType))} />
                <SelectFilter label="Payment status" value={f.status} onChange={v => set('status', v)} options={['overdue', 'due_soon', 'on_track', 'completed', 'no_plan'].map(s => ({ value: s, label: PAYMENT_STATUS[s].label }))} />
                <SelectFilter label="Payment plan" value={f.plan} onChange={v => set('plan', v)} options={[{ value: 'yes', label: 'Set up' }, { value: 'no', label: 'Not set up' }]} />
                <SelectFilter label="Frequency" value={f.freq} onChange={v => set('freq', v)} options={uniq(props.map(p => p.frequency))} />
                <SelectFilter label="Tenure" value={f.tenure} onChange={v => set('tenure', v)} options={['≤ 1 yr', '1–3 yrs', '3–5 yrs', '5–10 yrs', '10+ yrs']} />
                <SelectFilter label="Paid so far" value={f.progress} onChange={v => set('progress', v)} options={[{ value: '0-24', label: '0–24%' }, { value: '25-49', label: '25–49%' }, { value: '50-74', label: '50–74%' }, { value: '75-99', label: '75–99%' }, { value: '100', label: '100%' }]} />
                <SelectFilter label="Booked via" value={f.source} onChange={v => set('source', v)} options={[{ value: 'agent', label: 'Agent' }, { value: 'admin', label: 'Office / admin' }]} />
                <SelectFilter label="Agent" value={f.agent} onChange={v => set('agent', v)} options={uniq(props.map(p => p.agentName))} />
                <SelectFilter label="Booking docket" value={f.docket} onChange={v => set('docket', v)} options={[{ value: 'yes', label: 'Uploaded' }, { value: 'no', label: 'Missing' }]} />
                <SelectFilter label="Construction" value={f.construction} onChange={v => set('construction', v)} options={[{ value: 'notstarted', label: 'Not started' }, { value: 'progress', label: 'In progress' }, { value: 'done', label: 'Completed' }]} />
                <RangeFilter label="Deal value ₹" value={f.agreement} onChange={v => set('agreement', v)} />
                <RangeFilter label="Down payment ₹" value={f.down} onChange={v => set('down', v)} />
                <RangeFilter label="EMI ₹" value={f.emi} onChange={v => set('emi', v)} />
              </FilterPanel>
              <PagedTable columns={columns} rows={rows} initialSort={{ key: 'bookedAt', dir: 'desc' }} empty="No bookings match these filters." />
            </>
          ) : (
            <PagedTable
              rows={pending}
              empty="All approved agent bookings are linked to residents 🎉"
              columns={[
                { key: 'id', header: 'Booking', render: b => <span className="font-mono text-xs">AB-{b.id}</span> },
                { key: 'buyerName', header: 'Buyer', render: b => <div><div className="font-medium">{b.buyerName}</div><div className="text-xs text-slate-400">{b.buyerPhone}{b.buyerEmail ? ` · ${b.buyerEmail}` : ''}</div></div> },
                { key: 'unitNo', header: 'Unit', render: b => <div><div>{b.unitNo || '—'}</div><div className="text-xs text-slate-400">{[b.projectName, b.floor && `Floor ${b.floor}`, b.unitType].filter(Boolean).join(' · ')}</div></div> },
                { key: 'agentName', header: 'Agent' },
                { key: 'dealValue', header: 'Deal', align: 'right', render: b => inr(b.dealValue) },
                { key: 'bookingAmount', header: 'Booking amt', align: 'right', render: b => inr(b.bookingAmount) },
                { key: 'status', header: 'Status', render: b => <Pill tone={b.status === 'approved' ? 'green' : 'amber'}>{b.status}</Pill> },
                { key: 'createdAt', header: 'Booked on', render: b => shortDate(b.createdAt) },
                { key: 'go', header: '', noSort: true, render: () => <button onClick={() => navigate('/agents/bookings')} className="text-brand-primary text-xs font-semibold hover:underline">Open →</button> },
              ]}
            />
          )}
        </>
      )}
    </div>
  );
}
