import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import ResidentFormModal from './ResidentFormModal';
import {
  Kpi, KpiGrid, Panel, BarList, TrendBars, Progress, FilterPanel, SelectFilter, DateFilter,
  RangeFilter, FilterField, ctl, inNumRange, PagedTable, Pill, Chips, PAYMENT_STATUS, moneyCompact,
} from '../../components/Dash';
import {
  presetRange, inRange, groupBy, series, forwardSeries, sum, inr, pct, shortDate, exportCsv,
  matchText, uniq, todayIST, daysBetween,
} from '../../lib/dash';

function Avatar({ url, name }) {
  if (url) return <img src={url} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" />;
  return (
    <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary grid place-items-center text-xs font-bold shrink-0">
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

const D = { preset: '', from: '', to: '' };
const R = { min: '', max: '' };
const RESIDENT_FILTERS = {
  q: '', account: '', payStatus: '', joined: D, nextDue: D, lastPaid: D, project: '', tower: '', ptype: '',
  city: '', source: '', hasProperty: '', docket: '', overdueAge: '', outstanding: R, paid: R, agreement: R,
  progress: '', lateFee: '', dueThisMonth: '', activity: '', sos: '', contacts: '', method: '', notes: '',
};
const LEDGER_FILTERS = {
  q: '', status: '', due: D, paidOn: D, method: '', project: '', type: '', amount: R, overdueAge: '', source: '', resident: '',
};

function countActive(f, base) {
  return Object.keys(base).reduce((n, k) => {
    const v = f[k]; const b = base[k];
    if (typeof b === 'object') return n + ((v.preset || v.min !== undefined) && JSON.stringify(v) !== JSON.stringify(b) ? 1 : 0);
    return n + (v !== b ? 1 : 0);
  }, 0);
}

function overdueBucket(days) {
  if (!days) return '';
  if (days <= 30) return '1-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
}
function progressBucket(p, hasPlan) {
  if (!hasPlan) return 'none';
  if (p >= 100) return '100';
  if (p >= 75) return '75-99';
  if (p >= 50) return '50-74';
  if (p >= 25) return '25-49';
  return '0-24';
}

export default function UsersList() {
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState('residents');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState(RESIDENT_FILTERS);
  const [lf, setLf] = useState(LEDGER_FILTERS);
  const [sortKey, setSortKey] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/admin/crm/overview', { timeout: 60000 });
      setData(res.data);
    } catch (e) {
      toast.error(apiError(e, 'Could not load residents'));
    } finally {
      setLoading(false);
    }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const today = data?.today || todayIST();
  const residents = data?.residents || [];
  const ledger = data?.installments || [];
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const setL = (k, v) => setLf(p => ({ ...p, [k]: v }));

  // Options derived from data.
  const opts = useMemo(() => ({
    projects: uniq(residents.flatMap(r => r.projects)),
    towers: uniq(residents.flatMap(r => r.towers)),
    ptypes: uniq(residents.flatMap(r => r.propertyTypes)),
    cities: uniq(residents.map(r => r.city)),
    methods: uniq(ledger.map(i => i.isPaid && (i.method || 'Cash'))),
    sources: uniq(ledger.map(i => i.source)),
  }), [residents, ledger]);

  // ---------------- residents filtering ----------------
  const filtered = useMemo(() => {
    const rJoined = presetRange(f.joined.preset, f.joined, today);
    const rNext = presetRange(f.nextDue.preset, f.nextDue, today);
    const rLast = presetRange(f.lastPaid.preset, f.lastPaid, today);
    let rows = residents.filter(r => {
      if (!matchText(r, f.q, ['name', 'mobile', 'email', 'city', x => x.units.join(' '), x => x.projects.join(' ')])) return false;
      if (f.account && (f.account === 'active') !== r.isActive) return false;
      if (f.payStatus && r.paymentStatus !== f.payStatus) return false;
      if (!inRange(r.createdAt, rJoined)) return false;
      if (rNext && !inRange(r.nextDueDate, rNext)) return false;
      if (rLast && !inRange(r.lastPaidAt, rLast)) return false;
      if (f.project && !r.projects.includes(f.project)) return false;
      if (f.tower && !r.towers.includes(f.tower)) return false;
      if (f.ptype && !r.propertyTypes.includes(f.ptype)) return false;
      if (f.city && r.city !== f.city) return false;
      if (f.source && r.createdSource !== f.source) return false;
      if (f.hasProperty && (f.hasProperty === 'yes') !== (r.propertyCount > 0)) return false;
      if (f.docket && (f.docket === 'yes') !== (r.docketCount > 0)) return false;
      if (f.overdueAge && overdueBucket(r.maxOverdueDays) !== f.overdueAge) return false;
      if (!inNumRange(r.outstanding, f.outstanding)) return false;
      if (!inNumRange(r.paidTotal, f.paid)) return false;
      if (!inNumRange(r.agreementTotal, f.agreement)) return false;
      if (f.progress && progressBucket(r.progressPct, r.planCount > 0 || r.installmentCount > 0) !== f.progress) return false;
      if (f.lateFee && (f.lateFee === 'yes') !== (r.lateFees > 0)) return false;
      if (f.dueThisMonth && (f.dueThisMonth === 'yes') !== (r.dueThisMonthCount > 0)) return false;
      if (f.activity === 'recent' && !(r.recentBookings > 0)) return false;
      if (f.activity === 'none' && r.bookingCount > 0) return false;
      if (f.sos === 'any' && !(r.sosCount > 0)) return false;
      if (f.sos === 'open' && !(r.openSos > 0)) return false;
      if (f.contacts && (f.contacts === 'yes') !== (r.emergencyContacts > 0)) return false;
      if (f.method && r.lastPaidMethod !== f.method) return false;
      if (f.notes && (f.notes === 'yes') !== r.hasNotes) return false;
      return true;
    });
    const sorters = {
      outstanding: (a, b) => b.outstanding - a.outstanding,
      overdue: (a, b) => b.overdueAmount - a.overdueAmount || b.maxOverdueDays - a.maxOverdueDays,
      nextDue: (a, b) => (a.nextDueDate || '9999') < (b.nextDueDate || '9999') ? -1 : 1,
      paid: (a, b) => b.paidTotal - a.paidTotal,
      progress: (a, b) => b.progressPct - a.progressPct,
      newest: (a, b) => (a.createdAt < b.createdAt ? 1 : -1),
      name: (a, b) => String(a.name || '').localeCompare(String(b.name || '')),
      activity: (a, b) => (String(a.lastActivityAt || '') < String(b.lastActivityAt || '') ? 1 : -1),
    };
    if (sortKey && sorters[sortKey]) rows = [...rows].sort(sorters[sortKey]);
    return rows;
  }, [residents, f, today, sortKey]);

  const ids = useMemo(() => new Set(filtered.map(r => r.id)), [filtered]);
  const scopedLedger = useMemo(() => ledger.filter(i => ids.has(i.userId)), [ledger, ids]);

  // ---------------- residents KPIs (follow the filters) ----------------
  const k = useMemo(() => {
    const unpaid = scopedLedger.filter(i => !i.isPaid);
    const paid = scopedLedger.filter(i => i.isPaid);
    const thisMonth = today.slice(0, 7);
    const agreement = sum(filtered, r => r.agreementTotal);
    const collected = sum(filtered, r => r.paidTotal);
    const overdueRes = filtered.filter(r => r.paymentStatus === 'overdue');
    const withPlan = filtered.filter(r => r.planCount > 0 || r.installmentCount > 0);
    const next7 = unpaid.filter(i => i.dueDate && i.dueDate >= today && daysBetween(i.dueDate, today) <= 6);
    const next30 = unpaid.filter(i => i.dueDate && i.dueDate >= today && daysBetween(i.dueDate, today) <= 29);
    return {
      total: filtered.length,
      active: filtered.filter(r => r.isActive).length,
      blocked: filtered.filter(r => !r.isActive).length,
      newMonth: filtered.filter(r => String(r.createdAt || '').slice(0, 7) === thisMonth).length,
      withProperty: filtered.filter(r => r.propertyCount > 0).length,
      properties: sum(filtered, r => r.propertyCount),
      agreement,
      collected,
      outstanding: sum(filtered, r => r.outstanding),
      collectionPct: pct(collected, agreement),
      overdueRes: overdueRes.length,
      overdueAmt: sum(filtered, r => r.overdueAmount),
      avgOverdueDays: overdueRes.length ? Math.round(sum(overdueRes, r => r.maxOverdueDays) / overdueRes.length) : 0,
      lateFees: sum(filtered, r => r.lateFees),
      dueMonthAmt: sum(filtered, r => r.dueThisMonthAmount),
      dueMonthCount: sum(filtered, r => r.dueThisMonthCount),
      paidMonth: sum(paid.filter(i => String(i.paidAt || '').slice(0, 7) === thisMonth), i => i.paidAmount ?? i.amount),
      next7Amt: sum(next7, i => i.amount),
      next7Count: next7.length,
      next30Amt: sum(next30, i => i.amount),
      next30Count: next30.length,
      completed: filtered.filter(r => r.paymentStatus === 'completed').length,
      noPlan: filtered.filter(r => r.paymentStatus === 'no_plan').length,
      dueSoon: filtered.filter(r => r.paymentStatus === 'due_soon').length,
      avgTicket: withPlan.length ? agreement / withPlan.length : null,
      downpayments: sum(filtered, r => r.downpaymentTotal),
      withDocket: filtered.filter(r => r.docketCount > 0).length,
      bookings30: sum(filtered, r => r.recentBookings),
      openSos: sum(filtered, r => r.openSos),
      noContacts: filtered.filter(r => !r.emergencyContacts).length,
    };
  }, [filtered, scopedLedger, today]);

  const charts = useMemo(() => ({
    status: groupBy(filtered, r => PAYMENT_STATUS[r.paymentStatus]?.label || r.paymentStatus),
    collections: series(scopedLedger.filter(i => i.isPaid), i => i.paidAt, { by: 'month', months: 12, amount: i => i.paidAmount ?? i.amount, today }),
    forecast: forwardSeries(scopedLedger.filter(i => !i.isPaid), i => i.dueDate, i => i.amount, 6, today),
    ageing: ['1-30', '31-60', '61-90', '90+'].map(b => {
      const rows = scopedLedger.filter(i => i.status === 'overdue' && overdueBucket(i.overdueDays) === b);
      return { label: `${b} days`, value: sum(rows, i => i.amount), count: rows.length };
    }),
    projects: groupBy(filtered.filter(r => r.projects.length), r => r.projects, { amount: r => r.outstanding }),
    methods: groupBy(scopedLedger.filter(i => i.isPaid), i => i.method || 'Cash', { amount: i => i.paidAmount ?? i.amount }),
  }), [filtered, scopedLedger, today]);

  // ---------------- ledger (collections tab) ----------------
  const ledgerRows = useMemo(() => {
    const rDue = presetRange(lf.due.preset, lf.due, today);
    const rPaid = presetRange(lf.paidOn.preset, lf.paidOn, today);
    return ledger.filter(i => {
      if (!matchText(i, lf.q, ['residentName', 'residentMobile', 'residentEmail', 'property', 'projectName', 'label', 'txnId'])) return false;
      if (lf.status && i.status !== lf.status) return false;
      if (rDue && !inRange(i.dueDate, rDue)) return false;
      if (rPaid && !inRange(i.paidAt, rPaid)) return false;
      if (lf.method && (i.method || 'Cash') !== lf.method) return false;
      if (lf.project && i.projectName !== lf.project) return false;
      if (lf.type && (lf.type === 'down') !== i.isDownpayment) return false;
      if (!inNumRange(i.amount, lf.amount)) return false;
      if (lf.overdueAge && overdueBucket(i.overdueDays) !== lf.overdueAge) return false;
      if (lf.source && i.source !== lf.source) return false;
      if (lf.resident && String(i.userId) !== lf.resident) return false;
      return true;
    });
  }, [ledger, lf, today]);

  const lk = useMemo(() => {
    const paid = ledgerRows.filter(i => i.isPaid);
    const unpaid = ledgerRows.filter(i => !i.isPaid);
    const overdue = unpaid.filter(i => i.status === 'overdue');
    const late = paid.filter(i => i.dueDate && i.paidAt && i.paidAt > i.dueDate);
    const timed = paid.filter(i => i.dueDate && i.paidAt);
    const thisMonth = today.slice(0, 7);
    return {
      scheduled: sum(ledgerRows, i => i.amount),
      count: ledgerRows.length,
      collected: sum(paid, i => i.paidAmount ?? i.amount),
      paidCount: paid.length,
      pending: sum(unpaid, i => i.amount),
      pendingCount: unpaid.length,
      overdue: sum(overdue, i => i.amount),
      overdueCount: overdue.length,
      dueToday: unpaid.filter(i => i.dueDate === today),
      next7: unpaid.filter(i => i.dueDate && i.dueDate >= today && daysBetween(i.dueDate, today) <= 6),
      dueMonth: unpaid.filter(i => String(i.dueDate || '').slice(0, 7) === thisMonth),
      paidMonth: paid.filter(i => String(i.paidAt || '').slice(0, 7) === thisMonth),
      paidToday: paid.filter(i => i.paidAt === today),
      onTime: timed.length ? pct(timed.length - late.length, timed.length) : '—',
      avgDelay: late.length ? Math.round(sum(late, i => daysBetween(i.paidAt, i.dueDate)) / late.length) : 0,
      lateFees: sum(unpaid, i => i.lateFee),
      defaulters: new Set(overdue.map(i => i.userId)).size,
    };
  }, [ledgerRows, today]);

  // The list rows don't carry the full address; load the complete record so
  // saving the edit form can't blank out fields it never received.
  async function openEdit(row) {
    try {
      const { data: res } = await api.get(`/admin/users/${row.id}`);
      setEditTarget(res.data);
      setFormOpen(true);
    } catch (e) { toast.error(apiError(e, 'Could not load resident')); }
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      await api.delete(`/admin/users/${delTarget.id}`);
      toast.success('Resident deleted');
      setDelTarget(null);
      load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const residentColumns = [
    { key: 'name', header: 'Resident', sort: r => r.name || '', render: r => (
      <div className="flex items-center gap-2 min-w-[170px]">
        <Avatar url={r.profilePhoto} name={r.name} />
        <div className="min-w-0">
          <div className="font-medium text-slate-800 truncate">{r.name || '—'} {!r.isActive && <Pill tone="red">Blocked</Pill>}</div>
          <div className="text-xs text-slate-400 truncate">{r.mobile}{r.email ? ` · ${r.email}` : ''}</div>
        </div>
      </div>
    ) },
    { key: 'units', header: 'Property', sort: r => r.propertyCount, render: r => (
      r.propertyCount ? (
        <div className="min-w-[120px]">
          <div className="text-slate-700 truncate">{r.units.slice(0, 2).join(', ') || `${r.propertyCount} property`}</div>
          <div className="text-xs text-slate-400 truncate">{r.projects.join(', ') || '—'}</div>
        </div>
      ) : <span className="text-slate-400 text-xs">No property</span>
    ) },
    { key: 'paymentStatus', header: 'Payments', render: r => <Pill tone={PAYMENT_STATUS[r.paymentStatus]?.tone}>{PAYMENT_STATUS[r.paymentStatus]?.label}</Pill> },
    { key: 'agreementTotal', header: 'Agreement', align: 'right', render: r => (r.agreementTotal ? moneyCompact(r.agreementTotal) : '—') },
    { key: 'paidTotal', header: 'Paid', align: 'right', render: r => (
      r.agreementTotal ? (
        <div className="min-w-[90px]">
          <div>{moneyCompact(r.paidTotal)} <span className="text-[11px] text-slate-400">{r.progressPct}%</span></div>
          <Progress value={r.progressPct} className="mt-1" />
        </div>
      ) : '—'
    ) },
    { key: 'outstanding', header: 'Outstanding', align: 'right', render: r => (r.outstanding ? <span className="font-semibold">{moneyCompact(r.outstanding)}</span> : '—') },
    { key: 'overdueAmount', header: 'Overdue', align: 'right', render: r => (r.overdueCount ? (
      <div><span className="font-semibold text-rose-600">{moneyCompact(r.overdueAmount)}</span><div className="text-[11px] text-rose-400">{r.overdueCount} inst · {r.maxOverdueDays}d</div></div>
    ) : <span className="text-slate-300">—</span>) },
    { key: 'nextDueDate', header: 'Next due', sort: r => r.nextDueDate || '9999', render: r => (r.nextDueDate ? (
      <div className="whitespace-nowrap"><div className={r.nextDueDate < today ? 'text-rose-600 font-medium' : ''}>{shortDate(r.nextDueDate)}</div><div className="text-[11px] text-slate-400">{inr(r.nextDueAmount)}</div></div>
    ) : '—') },
    { key: 'lastPaidAt', header: 'Last paid', sort: r => r.lastPaidAt || '', render: r => (r.lastPaidAt ? (
      <div className="whitespace-nowrap"><div>{shortDate(r.lastPaidAt)}</div><div className="text-[11px] text-slate-400">{inr(r.lastPaidAmount)} · {r.lastPaidMethod || 'Cash'}</div></div>
    ) : '—') },
    { key: 'docketCount', header: 'Docket', align: 'right', render: r => (r.docketCount ? <Pill tone="green">📘 {r.docketCount}</Pill> : <Pill tone="amber">Missing</Pill>) },
    { key: 'bookingCount', header: 'Bookings', align: 'right', render: r => (
      <span title={Object.entries(r.activityByKind).map(([kk, v]) => `${kk}: ${v}`).join(', ')}>{r.bookingCount}{r.openSos ? <span className="ml-1 text-rose-600">🆘{r.openSos}</span> : ''}</span>
    ) },
    { key: 'createdAt', header: 'Joined', sort: r => r.createdAt, render: r => <span className="whitespace-nowrap text-slate-500">{shortDate(r.createdAt)}</span> },
    { key: 'actions', header: '', noSort: true, render: r => (
      <div className="flex items-center gap-3 justify-end whitespace-nowrap" onClick={e => e.stopPropagation()}>
        <button onClick={() => navigate(`/users/${r.id}`)} className="text-brand-primary font-semibold hover:underline">View</button>
        <button onClick={() => openEdit(r)} className="text-slate-600 font-semibold hover:underline">Edit</button>
        <button onClick={() => setDelTarget(r)} className="text-rose-600 font-semibold hover:underline">Delete</button>
      </div>
    ) },
  ];

  const ledgerColumns = [
    { key: 'residentName', header: 'Resident', render: i => (
      <button onClick={() => navigate(`/users/${i.userId}`)} className="text-left">
        <div className="font-medium text-slate-800 hover:underline">{i.residentName || '—'}</div>
        <div className="text-xs text-slate-400">{i.residentMobile}</div>
      </button>
    ) },
    { key: 'property', header: 'Property', render: i => <div><div>{i.property}</div><div className="text-xs text-slate-400">{i.projectName || ''}</div></div> },
    { key: 'label', header: 'Installment', sort: i => i.seq, render: i => <span className={i.isDownpayment ? 'font-semibold' : ''}>{i.label}</span> },
    { key: 'dueDate', header: 'Due date', render: i => <span className="whitespace-nowrap">{shortDate(i.dueDate)}</span> },
    { key: 'amount', header: 'Amount', align: 'right', render: i => inr(i.amount) },
    { key: 'status', header: 'Status', render: i => (
      <div><Pill tone={PAYMENT_STATUS[i.status]?.tone}>{PAYMENT_STATUS[i.status]?.label || i.status}</Pill>
        {i.status === 'overdue' && <div className="text-[11px] text-rose-500 mt-0.5">{i.overdueDays} days{i.lateFee ? ` · fee ${inr(i.lateFee)}` : ''}</div>}
        {i.status === 'due_soon' && <div className="text-[11px] text-amber-600 mt-0.5">in {i.daysToDue} day(s)</div>}
      </div>
    ) },
    { key: 'paidAt', header: 'Paid on', render: i => (i.isPaid ? <span className="whitespace-nowrap">{shortDate(i.paidAt)}</span> : '—') },
    { key: 'paidAmount', header: 'Paid', align: 'right', render: i => (i.isPaid ? inr(i.paidAmount ?? i.amount) : '—') },
    { key: 'method', header: 'Mode / Ref', render: i => (i.isPaid ? <div><div>{i.method || 'Cash'}</div><div className="text-[11px] text-slate-400">{i.txnId || `INST-${i.id}`}</div></div> : '—') },
    { key: 'open', header: '', noSort: true, render: i => <button onClick={() => navigate(`/payment-plan/${i.propertyId}`)} className="text-brand-primary text-xs font-semibold hover:underline whitespace-nowrap">Manage plan →</button> },
  ];

  function exportResidents() {
    exportCsv(`residents-${today}.csv`, [
      { header: 'Name', value: r => r.name }, { header: 'Mobile', value: r => r.mobile }, { header: 'Email', value: r => r.email },
      { header: 'Status', value: r => (r.isActive ? 'Active' : 'Blocked') }, { header: 'Payment status', value: r => PAYMENT_STATUS[r.paymentStatus]?.label },
      { header: 'Properties', value: r => r.units.join(' | ') }, { header: 'Projects', value: r => r.projects.join(' | ') },
      { header: 'Agreement', value: r => r.agreementTotal }, { header: 'Down payment', value: r => r.downpaymentTotal },
      { header: 'Paid', value: r => r.paidTotal }, { header: 'Outstanding', value: r => r.outstanding }, { header: 'Progress %', value: r => r.progressPct },
      { header: 'Overdue count', value: r => r.overdueCount }, { header: 'Overdue amount', value: r => r.overdueAmount }, { header: 'Max overdue days', value: r => r.maxOverdueDays },
      { header: 'Late fees', value: r => r.lateFees }, { header: 'Next due date', value: r => r.nextDueDate }, { header: 'Next due amount', value: r => r.nextDueAmount },
      { header: 'Last paid on', value: r => r.lastPaidAt }, { header: 'Last paid amount', value: r => r.lastPaidAmount }, { header: 'Dockets', value: r => r.docketCount },
      { header: 'Bookings', value: r => r.bookingCount }, { header: 'Joined', value: r => String(r.createdAt || '').slice(0, 10) },
    ], filtered);
  }
  function exportLedger() {
    exportCsv(`installments-${today}.csv`, [
      { header: 'Resident', value: i => i.residentName }, { header: 'Mobile', value: i => i.residentMobile }, { header: 'Property', value: i => i.property },
      { header: 'Project', value: i => i.projectName }, { header: 'Installment', value: i => i.label }, { header: 'Due date', value: i => i.dueDate },
      { header: 'Amount', value: i => i.amount }, { header: 'Status', value: i => PAYMENT_STATUS[i.status]?.label || i.status },
      { header: 'Days overdue', value: i => i.overdueDays }, { header: 'Late fee', value: i => i.lateFee }, { header: 'Paid on', value: i => i.paidAt },
      { header: 'Paid amount', value: i => (i.isPaid ? (i.paidAmount ?? i.amount) : '') }, { header: 'Method', value: i => (i.isPaid ? (i.method || 'Cash') : '') },
      { header: 'Reference', value: i => (i.isPaid ? (i.txnId || `INST-${i.id}`) : '') },
    ], ledgerRows);
  }

  const pick = (k2, v) => setF(p => ({ ...p, [k2]: p[k2] === v ? '' : v }));

  return (
    <div>
      <PageHeader title="Users & Residents" subtitle={loading ? 'Loading…' : `${residents.length} residents · ${ledger.length} scheduled installments · live from the app`}>
        <button onClick={load} className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">↻ Refresh</button>
        <button onClick={() => { setEditTarget(null); setFormOpen(true); }} className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90">+ Add resident</button>
      </PageHeader>

      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {[['residents', `👥 Residents (${filtered.length})`], ['ledger', `💳 Collections & dues (${ledgerRows.length})`]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${tab === key ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{label}</button>
        ))}
      </div>

      {loading && !data ? <div className="text-slate-400 py-10 text-center">Loading resident CRM…</div> : tab === 'residents' ? (
        <>
          <FilterPanel
            active={countActive(f, RESIDENT_FILTERS)}
            onReset={() => setF(RESIDENT_FILTERS)}
            extra={(
              <>
                <select value={sortKey} onChange={e => setSortKey(e.target.value)} className="text-sm border border-slate-300 rounded-lg px-2 py-1.5">
                  <option value="">Sort: default</option>
                  <option value="outstanding">Highest outstanding</option>
                  <option value="overdue">Most overdue</option>
                  <option value="nextDue">Next due first</option>
                  <option value="paid">Most paid</option>
                  <option value="progress">Highest progress</option>
                  <option value="activity">Recently active</option>
                  <option value="newest">Newest first</option>
                  <option value="name">Name A–Z</option>
                </select>
                <button onClick={exportResidents} className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">⬇ Export CSV</button>
              </>
            )}
          >
            <FilterField label="Search" className="col-span-2">
              <input value={f.q} onChange={e => set('q', e.target.value)} placeholder="Name, phone, email, flat, project…" className={ctl} />
            </FilterField>
            <SelectFilter label="Payment status" value={f.payStatus} onChange={v => set('payStatus', v)} options={Object.entries(PAYMENT_STATUS).filter(([kk]) => !['paid', 'upcoming'].includes(kk)).map(([value, s]) => ({ value, label: s.label }))} />
            <SelectFilter label="Account" value={f.account} onChange={v => set('account', v)} options={[{ value: 'active', label: 'Active' }, { value: 'blocked', label: 'Blocked' }]} />
            <DateFilter label="Next due date" value={f.nextDue} onChange={v => set('nextDue', v)} />
            <DateFilter label="Last payment" value={f.lastPaid} onChange={v => set('lastPaid', v)} />
            <DateFilter label="Joined" value={f.joined} onChange={v => set('joined', v)} />
            <SelectFilter label="Overdue age" value={f.overdueAge} onChange={v => set('overdueAge', v)} options={['1-30', '31-60', '61-90', '90+'].map(b => ({ value: b, label: `${b} days` }))} />
            <RangeFilter label="Outstanding ₹" value={f.outstanding} onChange={v => set('outstanding', v)} />
            <RangeFilter label="Paid ₹" value={f.paid} onChange={v => set('paid', v)} />
            <RangeFilter label="Agreement value ₹" value={f.agreement} onChange={v => set('agreement', v)} />
            <SelectFilter label="Payment progress" value={f.progress} onChange={v => set('progress', v)} options={[{ value: '0-24', label: '0–24%' }, { value: '25-49', label: '25–49%' }, { value: '50-74', label: '50–74%' }, { value: '75-99', label: '75–99%' }, { value: '100', label: '100% paid' }, { value: 'none', label: 'No plan' }]} />
            <SelectFilter label="Project" value={f.project} onChange={v => set('project', v)} options={opts.projects} />
            <SelectFilter label="Tower" value={f.tower} onChange={v => set('tower', v)} options={opts.towers} />
            <SelectFilter label="Property type" value={f.ptype} onChange={v => set('ptype', v)} options={opts.ptypes} />
            <SelectFilter label="City" value={f.city} onChange={v => set('city', v)} options={opts.cities} />
            <SelectFilter label="Has property" value={f.hasProperty} onChange={v => set('hasProperty', v)} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} />
            <SelectFilter label="Booking docket" value={f.docket} onChange={v => set('docket', v)} options={[{ value: 'yes', label: 'Uploaded' }, { value: 'no', label: 'Missing' }]} />
            <SelectFilter label="Late fees" value={f.lateFee} onChange={v => set('lateFee', v)} options={[{ value: 'yes', label: 'Accruing' }, { value: 'no', label: 'None' }]} />
            <SelectFilter label="Due this month" value={f.dueThisMonth} onChange={v => set('dueThisMonth', v)} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} />
            <SelectFilter label="Last payment mode" value={f.method} onChange={v => set('method', v)} options={opts.methods} />
            <SelectFilter label="App activity" value={f.activity} onChange={v => set('activity', v)} options={[{ value: 'recent', label: 'Booked in last 30 days' }, { value: 'none', label: 'Never booked' }]} />
            <SelectFilter label="SOS" value={f.sos} onChange={v => set('sos', v)} options={[{ value: 'any', label: 'Ever raised SOS' }, { value: 'open', label: 'Open SOS now' }]} />
            <SelectFilter label="Emergency contacts" value={f.contacts} onChange={v => set('contacts', v)} options={[{ value: 'yes', label: 'Added' }, { value: 'no', label: 'Missing' }]} />
            <SelectFilter label="Onboarded via" value={f.source} onChange={v => set('source', v)} options={[{ value: 'admin', label: 'Admin portal' }, { value: 'app', label: 'App sign-up' }]} />
            <SelectFilter label="Admin notes" value={f.notes} onChange={v => set('notes', v)} options={[{ value: 'yes', label: 'Has notes' }, { value: 'no', label: 'No notes' }]} />
          </FilterPanel>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400">Quick:</span>
            <Chips
              value={f.payStatus}
              onChange={v => set('payStatus', v)}
              options={[{ key: '', label: 'All', count: residents.length }, ...['overdue', 'due_soon', 'on_track', 'completed', 'no_plan'].map(s => ({ key: s, label: PAYMENT_STATUS[s].label, count: residents.filter(r => r.paymentStatus === s).length }))]}
            />
          </div>

          <KpiGrid>
            <Kpi icon="👥" label="Residents" value={k.total} sub={`${k.active} active · ${k.blocked} blocked`} />
            <Kpi icon="🆕" label="Joined this month" value={k.newMonth} />
            <Kpi icon="🏠" label="Properties" value={k.properties} sub={`${k.withProperty} residents own one`} onClick={() => pick('hasProperty', 'yes')} active={f.hasProperty === 'yes'} />
            <Kpi icon="📄" label="Agreement value" value={moneyCompact(k.agreement)} sub={k.avgTicket ? `avg ${moneyCompact(k.avgTicket)} / resident` : ''} />
            <Kpi icon="💰" label="Collected" value={moneyCompact(k.collected)} tone="good" sub={`${k.collectionPct} of agreement`} />
            <Kpi icon="⏳" label="Outstanding" value={moneyCompact(k.outstanding)} tone="info" />
            <Kpi icon="🚨" label="Overdue residents" value={k.overdueRes} tone="bad" sub={k.avgOverdueDays ? `avg ${k.avgOverdueDays} days late` : ''} onClick={() => pick('payStatus', 'overdue')} active={f.payStatus === 'overdue'} />
            <Kpi icon="💸" label="Overdue amount" value={moneyCompact(k.overdueAmt)} tone="bad" />
            <Kpi icon="⚠️" label="Late fees accruing" value={moneyCompact(k.lateFees)} tone={k.lateFees ? 'warn' : 'muted'} onClick={() => pick('lateFee', 'yes')} active={f.lateFee === 'yes'} />
            <Kpi icon="📅" label="Due this month" value={moneyCompact(k.dueMonthAmt)} sub={`${k.dueMonthCount} installment(s)`} onClick={() => pick('dueThisMonth', 'yes')} active={f.dueThisMonth === 'yes'} />
            <Kpi icon="✅" label="Collected this month" value={moneyCompact(k.paidMonth)} tone="good" />
            <Kpi icon="⏰" label="Due next 7 days" value={moneyCompact(k.next7Amt)} tone="warn" sub={`${k.next7Count} installment(s)`} onClick={() => pick('payStatus', 'due_soon')} active={f.payStatus === 'due_soon'} />
            <Kpi icon="🗓️" label="Due next 30 days" value={moneyCompact(k.next30Amt)} sub={`${k.next30Count} installment(s)`} />
            <Kpi icon="🏁" label="Fully paid" value={k.completed} tone="good" onClick={() => pick('payStatus', 'completed')} active={f.payStatus === 'completed'} />
            <Kpi icon="➖" label="No payment plan" value={k.noPlan} tone="muted" onClick={() => pick('payStatus', 'no_plan')} active={f.payStatus === 'no_plan'} />
            <Kpi icon="🔖" label="Down payments" value={moneyCompact(k.downpayments)} />
            <Kpi icon="📘" label="Docket coverage" value={pct(k.withDocket, k.total)} sub={`${k.total - k.withDocket} missing`} onClick={() => pick('docket', 'no')} active={f.docket === 'no'} />
            <Kpi icon="🛎️" label="Bookings (30 days)" value={k.bookings30} onClick={() => pick('activity', 'recent')} active={f.activity === 'recent'} />
            <Kpi icon="🆘" label="Open SOS" value={k.openSos} tone={k.openSos ? 'bad' : 'muted'} onClick={() => pick('sos', 'open')} active={f.sos === 'open'} />
            <Kpi icon="☎️" label="No emergency contact" value={k.noContacts} tone={k.noContacts ? 'warn' : 'muted'} onClick={() => pick('contacts', 'no')} active={f.contacts === 'no'} />
            <Kpi icon="📈" label="On track" value={residents.length ? filtered.filter(r => r.paymentStatus === 'on_track').length : 0} tone="info" onClick={() => pick('payStatus', 'on_track')} active={f.payStatus === 'on_track'} />
            <Kpi icon="🔔" label="Due ≤ 7 days" value={k.dueSoon} tone="warn" />
          </KpiGrid>

          <div className="grid lg:grid-cols-3 gap-4 mt-4">
            <Panel title="Collections — last 12 months" subtitle="Payments received from the filtered residents" className="lg:col-span-2">
              <TrendBars points={charts.collections} metric="amount" format={v => moneyCompact(v)} />
            </Panel>
            <Panel title="Payment status" subtitle="Click to filter">
              <BarList items={charts.status} onPick={label => { const key = Object.keys(PAYMENT_STATUS).find(s => PAYMENT_STATUS[s].label === label); if (key) pick('payStatus', key); }} picked={PAYMENT_STATUS[f.payStatus]?.label} />
            </Panel>
            <Panel title="Dues forecast — next 6 months" subtitle="Scheduled, still unpaid" className="lg:col-span-2">
              <TrendBars points={charts.forecast} metric="amount" format={v => moneyCompact(v)} />
            </Panel>
            <Panel title="Overdue ageing" subtitle="Unpaid amount by days late">
              <BarList items={charts.ageing} valueLabel={(v, i) => `${moneyCompact(v)} · ${i.count}`} color="bg-rose-400" />
            </Panel>
            <Panel title="Outstanding by project">
              <BarList items={charts.projects.map(p => ({ ...p, value: p.amount }))} valueLabel={v => moneyCompact(v)} onPick={v => pick('project', v)} picked={f.project} />
            </Panel>
            <Panel title="Payment modes" subtitle="Share of amount collected">
              <BarList items={charts.methods.map(p => ({ ...p, value: p.amount }))} valueLabel={v => moneyCompact(v)} color="bg-emerald-400" />
            </Panel>
            <Panel title="Top outstanding residents">
              <BarList items={[...filtered].sort((a, b) => b.outstanding - a.outstanding).filter(r => r.outstanding > 0).slice(0, 8).map(r => ({ label: r.name || r.mobile, value: r.outstanding }))} valueLabel={v => moneyCompact(v)} color="bg-sky-400" />
            </Panel>
          </div>

          <div className="mt-4">
            <PagedTable columns={residentColumns} rows={filtered} onRow={r => navigate(`/users/${r.id}`)} empty="No residents match these filters." />
          </div>
        </>
      ) : (
        <>
          <FilterPanel
            active={countActive(lf, LEDGER_FILTERS)}
            onReset={() => setLf(LEDGER_FILTERS)}
            extra={<button onClick={exportLedger} className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">⬇ Export CSV</button>}
          >
            <FilterField label="Search" className="col-span-2">
              <input value={lf.q} onChange={e => setL('q', e.target.value)} placeholder="Resident, phone, flat, installment, txn id…" className={ctl} />
            </FilterField>
            <SelectFilter label="Status" value={lf.status} onChange={v => setL('status', v)} options={['overdue', 'due_soon', 'upcoming', 'paid'].map(s => ({ value: s, label: PAYMENT_STATUS[s].label }))} />
            <DateFilter label="Due date" value={lf.due} onChange={v => setL('due', v)} />
            <DateFilter label="Paid on" value={lf.paidOn} onChange={v => setL('paidOn', v)} />
            <SelectFilter label="Resident" value={lf.resident} onChange={v => setL('resident', v)} options={residents.filter(r => ledger.some(i => i.userId === r.id)).map(r => ({ value: String(r.id), label: r.name || r.mobile }))} />
            <SelectFilter label="Project" value={lf.project} onChange={v => setL('project', v)} options={uniq(ledger.map(i => i.projectName))} />
            <SelectFilter label="Type" value={lf.type} onChange={v => setL('type', v)} options={[{ value: 'down', label: 'Down payment' }, { value: 'inst', label: 'Installment' }]} />
            <SelectFilter label="Payment mode" value={lf.method} onChange={v => setL('method', v)} options={opts.methods} />
            <SelectFilter label="Recorded via" value={lf.source} onChange={v => setL('source', v)} options={opts.sources.map(s => ({ value: s, label: s === 'online' ? 'Online (app)' : s === 'cash' ? 'Cash / office' : s }))} />
            <SelectFilter label="Overdue age" value={lf.overdueAge} onChange={v => setL('overdueAge', v)} options={['1-30', '31-60', '61-90', '90+'].map(b => ({ value: b, label: `${b} days` }))} />
            <RangeFilter label="Amount ₹" value={lf.amount} onChange={v => setL('amount', v)} />
          </FilterPanel>

          <KpiGrid>
            <Kpi icon="🧾" label="Scheduled (filtered)" value={moneyCompact(lk.scheduled)} sub={`${lk.count} installment(s)`} />
            <Kpi icon="💰" label="Collected" value={moneyCompact(lk.collected)} tone="good" sub={`${lk.paidCount} paid · ${pct(lk.collected, lk.scheduled)}`} onClick={() => setL('status', lf.status === 'paid' ? '' : 'paid')} active={lf.status === 'paid'} />
            <Kpi icon="⏳" label="Pending" value={moneyCompact(lk.pending)} tone="info" sub={`${lk.pendingCount} unpaid`} />
            <Kpi icon="🚨" label="Overdue" value={moneyCompact(lk.overdue)} tone="bad" sub={`${lk.overdueCount} inst · ${lk.defaulters} resident(s)`} onClick={() => setL('status', lf.status === 'overdue' ? '' : 'overdue')} active={lf.status === 'overdue'} />
            <Kpi icon="📌" label="Due today" value={moneyCompact(sum(lk.dueToday, i => i.amount))} tone="warn" sub={`${lk.dueToday.length} installment(s)`} />
            <Kpi icon="⏰" label="Due next 7 days" value={moneyCompact(sum(lk.next7, i => i.amount))} tone="warn" sub={`${lk.next7.length} installment(s)`} onClick={() => setL('status', lf.status === 'due_soon' ? '' : 'due_soon')} active={lf.status === 'due_soon'} />
            <Kpi icon="📅" label="Due this month" value={moneyCompact(sum(lk.dueMonth, i => i.amount))} sub={`${lk.dueMonth.length} installment(s)`} onClick={() => setL('due', lf.due.preset === 'this_month' ? D : { ...D, preset: 'this_month' })} active={lf.due.preset === 'this_month'} />
            <Kpi icon="✅" label="Collected this month" value={moneyCompact(sum(lk.paidMonth, i => i.paidAmount ?? i.amount))} tone="good" sub={`${lk.paidMonth.length} payment(s)`} />
            <Kpi icon="🟢" label="Collected today" value={moneyCompact(sum(lk.paidToday, i => i.paidAmount ?? i.amount))} tone="good" sub={`${lk.paidToday.length} payment(s)`} />
            <Kpi icon="🎯" label="On-time payments" value={lk.onTime} sub={lk.avgDelay ? `late ones avg ${lk.avgDelay} days` : ''} />
            <Kpi icon="⚠️" label="Late fees accruing" value={moneyCompact(lk.lateFees)} tone={lk.lateFees ? 'warn' : 'muted'} />
            <Kpi icon="👤" label="Defaulters" value={lk.defaulters} tone={lk.defaulters ? 'bad' : 'muted'} />
          </KpiGrid>

          <div className="mt-4">
            <PagedTable columns={ledgerColumns} rows={ledgerRows} pageSize={30} initialSort={{ key: 'dueDate', dir: 'asc' }} empty="No installments match these filters." />
          </div>
        </>
      )}

      <ResidentFormModal
        open={formOpen}
        mode={editTarget ? 'edit' : 'create'}
        initial={editTarget}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />

      <ConfirmDialog
        open={!!delTarget}
        title="Delete resident?"
        message={`This permanently removes ${delTarget?.name || 'this resident'} and all their properties. This cannot be undone.`}
        confirmLabel="Delete"
        danger
        busy={busy}
        onCancel={() => setDelTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
