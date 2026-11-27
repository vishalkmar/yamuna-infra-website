import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import {
  Kpi, KpiGrid, Panel, BarList, TrendBars, FilterPanel, FilterField, SelectFilter, DateFilter, RangeFilter,
  ctl, inNumRange, PagedTable, Chips, moneyCompact,
} from '../../components/Dash';
import {
  presetRange, inRange, groupBy, series, sum, inr, pct, shortDate, exportCsv, matchText, uniq, todayIST,
  daysBetween, weekdayOf, WEEKDAYS,
} from '../../lib/dash';
import { fmtDateTime } from '../../lib/format';

// One dashboard for every service module. The backend returns normalised
// `records`; everything below (KPIs, charts, filters) is computed from them so
// numbers always reflect the active filters.

const CLOSED = ['cancelled', 'no_show'];
const DONE = ['completed', 'delivered', 'returned'];
const LABEL = s => String(s || '—').replace(/_/g, ' ');
const KIND_LABEL = {
  food_order: 'Food order', meal: 'Daily meal', tiffin: 'Tiffin subscription', appointment: 'Doctor appointment',
  medicine: 'Medicine order', service: 'Home service', mobility: 'Mobility aid', wellness: 'Wellness',
  darshan: 'Darshan', ride: 'Cab ride', amenity: 'Amenity booking',
};

const D = { preset: '', from: '', to: '' };
const R = { min: '', max: '' };
const BASE = {
  q: '', when: D, dateOn: 'created', status: '', kind: '', category: '', item: '', resident: '', amount: R,
  timing: '', weekday: '', priced: '', repeat: '', dim0: '', dim1: '',
};

export default function ModuleDashboard({ module, icon }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState(BASE);
  const [trendBy, setTrendBy] = useState('day');
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get(`/admin/insights/${module}`, { timeout: 60000 });
      setData(res.data);
    } catch (e) { toast.error(apiError(e, 'Could not load dashboard')); } finally { setLoading(false); }
  }, [module, toast]);
  useEffect(() => { setF(BASE); load(); }, [load]);

  const today = data?.today || todayIST();
  const records = data?.records || [];
  const dims = data?.dims || [];
  const hasAmount = records.some(r => r.amount != null);
  const hasKinds = uniq(records.map(r => r.kind)).length > 1;

  // Bookings per resident (for "repeat customer" filter/KPI).
  const perResident = useMemo(() => {
    const m = new Map();
    for (const r of records) if (r.userId != null) m.set(r.userId, (m.get(r.userId) || 0) + 1);
    return m;
  }, [records]);

  const rows = useMemo(() => {
    const range = presetRange(f.when.preset, f.when, today);
    return records.filter(r => {
      if (!matchText(r, f.q, ['code', 'residentName', 'residentMobile', 'item', 'category'])) return false;
      const d = f.dateOn === 'service' ? r.serviceDate : r.createdAt;
      if (range && !inRange(d, range)) return false;
      if (f.status && r.status !== f.status) return false;
      if (f.kind && r.kind !== f.kind) return false;
      if (f.category && r.category !== f.category) return false;
      if (f.item && r.item !== f.item) return false;
      if (f.resident && String(r.userId) !== f.resident) return false;
      if ((f.amount.min !== '' || f.amount.max !== '') && !inNumRange(r.amount ?? 0, f.amount)) return false;
      if (f.timing === 'upcoming' && !(r.serviceDate && String(r.serviceDate).slice(0, 10) >= today && !CLOSED.includes(r.status) && !DONE.includes(r.status))) return false;
      if (f.timing === 'past' && !(r.serviceDate && String(r.serviceDate).slice(0, 10) < today)) return false;
      if (f.timing === 'today' && String(r.serviceDate || '').slice(0, 10) !== today) return false;
      if (f.timing === 'open' && (CLOSED.includes(r.status) || DONE.includes(r.status))) return false;
      if (f.weekday && weekdayOf(f.dateOn === 'service' ? r.serviceDate : r.createdAt) !== f.weekday) return false;
      if (f.priced && (f.priced === 'yes') !== (r.amount != null && r.amount > 0)) return false;
      if (f.repeat === 'repeat' && !((perResident.get(r.userId) || 0) > 1)) return false;
      if (f.repeat === 'first' && (perResident.get(r.userId) || 0) > 1) return false;
      if (dims[0] && f.dim0 && String(r[dims[0].field]) !== f.dim0) return false;
      if (dims[1] && f.dim1 && String(r[dims[1].field]) !== f.dim1) return false;
      return true;
    });
  }, [records, f, today, dims, perResident]);

  const k = useMemo(() => {
    const live = rows.filter(r => !CLOSED.includes(r.status));
    const cancelled = rows.filter(r => CLOSED.includes(r.status));
    const completed = rows.filter(r => DONE.includes(r.status));
    const open = rows.filter(r => !CLOSED.includes(r.status) && !DONE.includes(r.status));
    const upcoming = open.filter(r => r.serviceDate && String(r.serviceDate).slice(0, 10) >= today);
    const created = p => rows.filter(r => inRange(r.createdAt, presetRange(p, {}, today))).length;
    const revenue = sum(live, r => r.amount);
    const priced = live.filter(r => r.amount != null && r.amount > 0);
    const residents = new Set(rows.map(r => r.userId).filter(x => x != null));
    const counts = new Map();
    for (const r of rows) if (r.userId != null) counts.set(r.userId, (counts.get(r.userId) || 0) + 1);
    const repeat = [...counts.values()].filter(c => c > 1).length;
    const leads = rows.filter(r => r.serviceDate && r.createdAt).map(r => daysBetween(r.serviceDate, r.createdAt)).filter(x => x != null && x >= 0);
    const topItem = groupBy(rows, r => r.item, { limit: 1 })[0];
    const topCat = groupBy(rows, r => r.category, { limit: 1 })[0];
    const busiest = groupBy(rows.filter(r => r.serviceDate || r.createdAt), r => weekdayOf(r.serviceDate || r.createdAt), { limit: 1 })[0];
    const thisMonthRev = sum(live.filter(r => String(r.createdAt || '').slice(0, 7) === today.slice(0, 7)), r => r.amount);
    return {
      total: rows.length, today: created('today'), week: created('this_week'), month: created('this_month'), year: created('this_year'),
      upcoming: upcoming.length, open: open.length, completed: completed.length, cancelled: cancelled.length,
      cancelRate: pct(cancelled.length, rows.length), completionRate: pct(completed.length, rows.length - open.length),
      serviceToday: rows.filter(r => String(r.serviceDate || '').slice(0, 10) === today && !CLOSED.includes(r.status)).length,
      revenue, thisMonthRev, avg: priced.length ? revenue / priced.length : null,
      residents: residents.size, repeat, perResident: residents.size ? (rows.length / residents.size).toFixed(1) : '—',
      lead: leads.length ? (leads.reduce((a, b) => a + b, 0) / leads.length).toFixed(1) : '—',
      topItem, topCat, busiest,
    };
  }, [rows, today]);

  const charts = useMemo(() => ({
    trend: trendBy === 'day'
      ? series(rows, r => r.createdAt, { by: 'day', days: 30, amount: r => (CLOSED.includes(r.status) ? 0 : r.amount), today })
      : series(rows, r => r.createdAt, { by: 'month', months: 12, amount: r => (CLOSED.includes(r.status) ? 0 : r.amount), today }),
    status: (data?.statuses || []).map(s => ({ label: s, value: rows.filter(r => r.status === s).length })).filter(x => x.value > 0)
      .concat(groupBy(rows.filter(r => !(data?.statuses || []).includes(r.status)), r => r.status)),
    items: groupBy(rows, r => r.item, { amount: r => (CLOSED.includes(r.status) ? 0 : r.amount) }),
    categories: groupBy(rows, r => r.category, { amount: r => (CLOSED.includes(r.status) ? 0 : r.amount) }),
    kinds: groupBy(rows, r => KIND_LABEL[r.kind] || r.kind),
    weekdays: WEEKDAYS.map(w => ({ label: w, value: rows.filter(r => weekdayOf(r.serviceDate || r.createdAt) === w).length })),
    dims: dims.map(d => ({ ...d, items: groupBy(rows, r => r[d.field]) })),
    residents: groupBy(rows.filter(r => r.residentName), r => r.residentName, { amount: r => (CLOSED.includes(r.status) ? 0 : r.amount), limit: 8 }),
  }), [rows, trendBy, data, dims]);

  const activeCount = Object.keys(BASE).reduce((n, key) => n + (JSON.stringify(f[key]) !== JSON.stringify(BASE[key]) && key !== 'dateOn' ? 1 : 0), 0);
  const pick = (key, v) => setF(p => ({ ...p, [key]: p[key] === v ? '' : v }));
  const residentsOpt = uniq(records.filter(r => r.userId != null).map(r => `${r.userId}::${r.residentName || r.residentMobile || r.userId}`))
    .map(x => { const [value, label] = x.split('::'); return { value, label }; });

  function exportRows() {
    exportCsv(`${module}-bookings-${today}.csv`, [
      { header: 'Code', value: r => r.code }, { header: 'Type', value: r => KIND_LABEL[r.kind] || r.kind },
      { header: 'Resident', value: r => r.residentName }, { header: 'Mobile', value: r => r.residentMobile },
      { header: 'Item', value: r => r.item }, { header: 'Category', value: r => r.category },
      ...dims.map(d => ({ header: d.label, value: r => r[d.field] })),
      { header: 'Amount', value: r => r.amount }, { header: 'Status', value: r => r.status },
      { header: 'Service date', value: r => String(r.serviceDate || '').slice(0, 10) }, { header: 'Created', value: r => r.createdAt },
    ], rows);
  }

  const columns = [
    { key: 'code', header: 'Ref', render: r => <span className="font-mono text-xs text-slate-600">{r.code}</span> },
    ...(hasKinds ? [{ key: 'kind', header: 'Type', render: r => <span className="text-xs">{KIND_LABEL[r.kind] || r.kind}</span> }] : []),
    { key: 'residentName', header: 'Resident', render: r => (r.userId ? (
      <button onClick={() => navigate(`/users/${r.userId}`)} className="text-left">
        <div className="font-medium text-slate-800 hover:underline">{r.residentName || '—'}</div>
        <div className="text-xs text-slate-400">{r.residentMobile}</div>
      </button>
    ) : '—') },
    { key: 'item', header: 'Booked', render: r => <div className="max-w-[260px]"><div className="truncate text-slate-800" title={r.item}>{r.item}</div><div className="text-xs text-slate-400 truncate">{r.category}{r.slot ? ` · ${r.slot}` : ''}</div></div> },
    ...dims.map(d => ({ key: d.field, header: d.label, render: r => <span className="text-xs capitalize">{LABEL(r[d.field])}</span> })),
    ...(hasAmount ? [{ key: 'amount', header: 'Amount', align: 'right', render: r => (r.amount != null ? inr(r.amount) : '—') }] : []),
    { key: 'serviceDate', header: 'For date', render: r => <span className={`whitespace-nowrap ${String(r.serviceDate || '').slice(0, 10) === today ? 'font-semibold text-brand-primary' : ''}`}>{shortDate(r.serviceDate)}</span> },
    { key: 'createdAt', header: 'Booked on', render: r => <span className="whitespace-nowrap text-slate-500">{fmtDateTime(r.createdAt)}</span> },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status}>{LABEL(r.status)}</StatusBadge> },
  ];

  return (
    <div>
      <PageHeader title={`${icon || '📊'} ${data?.title || ''} — Dashboard`} subtitle="Live from the resident app · every number follows the filters below">
        <button onClick={load} className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">↻ Refresh</button>
      </PageHeader>

      {loading && !data ? <div className="text-slate-400 py-10 text-center">Loading dashboard…</div> : (
        <>
          {data?.catalog?.length > 0 && (
            <Panel title="What residents see in the app right now" className="mb-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {data.catalog.map(c => (
                  <div key={c.label} className="rounded-lg bg-slate-50 px-3 py-2">
                    <div className={`text-lg font-bold ${c.tone === 'warn' ? 'text-amber-600' : 'text-slate-800'}`}>{c.value}</div>
                    <div className="text-xs text-slate-500">{c.label}</div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <KpiGrid>
            <Kpi icon="🧾" label="Total bookings" value={k.total} sub={`of ${records.length} all-time`} />
            <Kpi icon="📌" label="Booked today" value={k.today} onClick={() => set('when', f.when.preset === 'today' && f.dateOn === 'created' ? D : { ...D, preset: 'today' })} active={f.when.preset === 'today'} />
            <Kpi icon="🗓️" label="This week" value={k.week} onClick={() => set('when', f.when.preset === 'this_week' ? D : { ...D, preset: 'this_week' })} active={f.when.preset === 'this_week'} />
            <Kpi icon="📅" label="This month" value={k.month} onClick={() => set('when', f.when.preset === 'this_month' ? D : { ...D, preset: 'this_month' })} active={f.when.preset === 'this_month'} />
            <Kpi icon="📆" label="This year" value={k.year} onClick={() => set('when', f.when.preset === 'this_year' ? D : { ...D, preset: 'this_year' })} active={f.when.preset === 'this_year'} />
            <Kpi icon="🎯" label="Scheduled for today" value={k.serviceToday} tone="info" onClick={() => pick('timing', 'today')} active={f.timing === 'today'} />
            <Kpi icon="⏭️" label="Upcoming" value={k.upcoming} tone="info" onClick={() => pick('timing', 'upcoming')} active={f.timing === 'upcoming'} />
            <Kpi icon="⏳" label="Open / in progress" value={k.open} tone="warn" onClick={() => pick('timing', 'open')} active={f.timing === 'open'} />
            <Kpi icon="✅" label="Completed" value={k.completed} tone="good" sub={`completion ${k.completionRate}`} />
            <Kpi icon="✖️" label="Cancelled" value={k.cancelled} tone={k.cancelled ? 'bad' : 'muted'} sub={`rate ${k.cancelRate}`} onClick={() => pick('status', 'cancelled')} active={f.status === 'cancelled'} />
            {hasAmount && <Kpi icon="💰" label="Value (excl. cancelled)" value={moneyCompact(k.revenue)} tone="good" sub={`this month ${moneyCompact(k.thisMonthRev)}`} />}
            {hasAmount && <Kpi icon="🧮" label="Average value" value={k.avg != null ? inr(k.avg) : '—'} />}
            <Kpi icon="👥" label="Residents served" value={k.residents} sub={`${k.perResident} bookings each`} />
            <Kpi icon="🔁" label="Repeat residents" value={k.repeat} sub={pct(k.repeat, k.residents)} onClick={() => pick('repeat', 'repeat')} active={f.repeat === 'repeat'} />
            <Kpi icon="⭐" label="Most booked" value={k.topItem ? k.topItem.value : '—'} sub={k.topItem?.label} onClick={k.topItem ? () => pick('item', k.topItem.label) : undefined} active={!!f.item} />
            <Kpi icon="🏷️" label="Top category" value={k.topCat ? k.topCat.value : '—'} sub={k.topCat?.label} onClick={k.topCat ? () => pick('category', k.topCat.label) : undefined} active={!!f.category} />
            <Kpi icon="📈" label="Busiest day" value={k.busiest?.label || '—'} sub={k.busiest ? `${k.busiest.value} bookings` : ''} />
            <Kpi icon="⏱️" label="Avg booked ahead" value={k.lead === '—' ? '—' : `${k.lead} d`} sub="days between booking & service" />
          </KpiGrid>

          <div className="mt-5">
            <FilterPanel active={activeCount} onReset={() => setF(BASE)} extra={<button onClick={exportRows} className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">⬇ Export CSV</button>}>
              <FilterField label="Search" className="col-span-2">
                <input value={f.q} onChange={e => set('q', e.target.value)} placeholder="Ref, resident, phone, item, category…" className={ctl} />
              </FilterField>
              <DateFilter label="Date" value={f.when} onChange={v => set('when', v)} />
              <SelectFilter label="Date is" value={f.dateOn} onChange={v => set('dateOn', v || 'created')} all="Booked on" options={[{ value: 'service', label: 'Service / visit date' }]} />
              <SelectFilter label="Status" value={f.status} onChange={v => set('status', v)} options={uniq([...(data?.statuses || []), ...records.map(r => r.status)]).map(s => ({ value: s, label: LABEL(s) }))} />
              <SelectFilter label="Timing" value={f.timing} onChange={v => set('timing', v)} options={[{ value: 'today', label: 'Scheduled today' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'open', label: 'Open / in progress' }, { value: 'past', label: 'Past date' }]} />
              {hasKinds && <SelectFilter label="Type" value={f.kind} onChange={v => set('kind', v)} options={uniq(records.map(r => r.kind)).map(x => ({ value: x, label: KIND_LABEL[x] || x }))} />}
              <SelectFilter label="Category" value={f.category} onChange={v => set('category', v)} options={uniq(records.map(r => r.category))} />
              <SelectFilter label="Item / service" value={f.item} onChange={v => set('item', v)} options={uniq(records.map(r => r.item))} />
              <SelectFilter label="Resident" value={f.resident} onChange={v => set('resident', v)} options={residentsOpt} />
              {dims[0] && <SelectFilter label={dims[0].label} value={f.dim0} onChange={v => set('dim0', v)} options={uniq(records.map(r => r[dims[0].field])).map(x => ({ value: String(x), label: LABEL(x) }))} />}
              {dims[1] && <SelectFilter label={dims[1].label} value={f.dim1} onChange={v => set('dim1', v)} options={uniq(records.map(r => r[dims[1].field])).map(x => ({ value: String(x), label: LABEL(x) }))} />}
              <SelectFilter label="Day of week" value={f.weekday} onChange={v => set('weekday', v)} options={WEEKDAYS} />
              <SelectFilter label="Residents" value={f.repeat} onChange={v => set('repeat', v)} options={[{ value: 'repeat', label: 'Repeat residents' }, { value: 'first', label: 'One-time residents' }]} />
              {hasAmount && <RangeFilter label="Amount ₹" value={f.amount} onChange={v => set('amount', v)} />}
              {hasAmount && <SelectFilter label="Priced" value={f.priced} onChange={v => set('priced', v)} options={[{ value: 'yes', label: 'Has amount' }, { value: 'no', label: 'No amount' }]} />}
            </FilterPanel>
            <PagedTable columns={columns} rows={rows} initialSort={{ key: 'createdAt', dir: 'desc' }} empty={records.length ? 'No bookings match these filters.' : 'No bookings yet — they will appear here as soon as residents book from the app.'} />
          </div>
        </>
      )}
    </div>
  );
}
