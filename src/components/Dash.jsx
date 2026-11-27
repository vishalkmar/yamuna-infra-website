import React, { useMemo, useState } from 'react';
import { DATE_PRESETS, monthLabel, inr } from '../lib/dash';

// Building blocks for the CRM and module dashboards. Plain Tailwind, no chart
// library — bars are divs/SVG so the bundle stays small.

const TONES = {
  default: 'text-brand-primary',
  good: 'text-emerald-600',
  warn: 'text-amber-600',
  bad: 'text-rose-600',
  info: 'text-sky-600',
  muted: 'text-slate-500',
};

export function Kpi({ label, value, sub, icon, tone = 'default', onClick, active }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`text-left bg-white rounded-xl border p-3.5 transition ${active ? 'border-brand-primary ring-2 ring-brand-primary/20' : 'border-slate-200'} ${onClick ? 'hover:border-brand-primary/60 hover:shadow-sm cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`text-xl font-extrabold leading-tight ${TONES[tone] || TONES.default}`}>{value ?? '—'}</div>
        {icon && <div className="text-lg opacity-80">{icon}</div>}
      </div>
      <div className="text-xs font-medium text-slate-500 mt-1">{label}</div>
      {sub != null && sub !== '' && <div className="text-[11px] text-slate-400 mt-0.5 truncate">{sub}</div>}
    </Tag>
  );
}

export function KpiGrid({ children, cols = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6' }) {
  return <div className={`grid ${cols} gap-3`}>{children}</div>;
}

export function Panel({ title, subtitle, action, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-4 ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            {title && <h3 className="font-bold text-slate-800 text-sm">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

// Horizontal bars. items: [{ label, value, amount? }]
export function BarList({ items, valueLabel = v => v, empty = 'No data yet', onPick, picked, color = 'bg-brand-primary/80', max: maxItems = 8 }) {
  const shown = (items || []).slice(0, maxItems);
  const max = Math.max(1, ...shown.map(i => Number(i.value) || 0));
  if (!shown.length) return <p className="text-sm text-slate-400">{empty}</p>;
  return (
    <ul className="space-y-2">
      {shown.map(i => (
        <li key={i.label}>
          <button
            type="button"
            disabled={!onPick}
            onClick={() => onPick && onPick(i.label)}
            className={`w-full text-left ${onPick ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <div className="flex justify-between text-xs mb-0.5">
              <span className={`truncate pr-2 ${picked === i.label ? 'font-bold text-brand-primary' : 'text-slate-600'}`}>{i.label}</span>
              <span className="text-slate-500 whitespace-nowrap">{valueLabel(i.value, i)}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className={`h-full rounded-full ${picked === i.label ? 'bg-brand-primary' : color}`} style={{ width: `${Math.max(3, (Number(i.value) / max) * 100)}%` }} />
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

// Vertical bars for a time series. points: [{ label, value, amount }]
export function TrendBars({ points, metric = 'value', height = 120, format = v => v, labelFormat }) {
  const vals = (points || []).map(p => Number(p[metric]) || 0);
  const max = Math.max(1, ...vals);
  const fmtLabel = labelFormat || (l => (String(l).length === 7 ? monthLabel(l) : String(l).slice(8, 10)));
  const total = vals.reduce((a, b) => a + b, 0);
  if (!points || !points.length) return <p className="text-sm text-slate-400">No data</p>;
  const step = Math.ceil(points.length / 12);
  return (
    <div>
      <div className="flex items-end gap-[3px]" style={{ height }}>
        {points.map((p, i) => {
          const v = Number(p[metric]) || 0;
          return (
            <div key={p.label} className="flex-1 flex flex-col justify-end group relative h-full">
              <div
                className={`w-full rounded-t ${v ? 'bg-brand-primary/80 group-hover:bg-brand-primary' : 'bg-slate-100'}`}
                style={{ height: `${v ? Math.max(4, (v / max) * 100) : 3}%` }}
              />
              <div className="pointer-events-none absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap z-10">
                {fmtLabel(p.label)}: {format(v)}
              </div>
              {i % step === 0 && <div className="text-[9px] text-slate-400 text-center mt-1 truncate">{fmtLabel(p.label)}</div>}
            </div>
          );
        })}
      </div>
      <div className="text-[11px] text-slate-400 mt-1">Total: {format(total)}</div>
    </div>
  );
}

export function Progress({ value, tone = 'bg-emerald-500', className = '' }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className={`h-1.5 rounded-full bg-slate-100 overflow-hidden ${className}`}>
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${v}%` }} />
    </div>
  );
}

// ---------- filters ----------

export function FilterField({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">{label}</span>
      {children}
    </label>
  );
}

export const ctl = 'w-full text-sm border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary';

export function SelectFilter({ label, value, onChange, options, all = 'All', className }) {
  return (
    <FilterField label={label} className={className}>
      <select value={value} onChange={e => onChange(e.target.value)} className={ctl}>
        <option value="">{all}</option>
        {options.map(o => (typeof o === 'object'
          ? <option key={o.value} value={o.value}>{o.label}</option>
          : <option key={o} value={o}>{o}</option>))}
      </select>
    </FilterField>
  );
}

// Preset + custom range in one control. value: { preset, from, to }
export function DateFilter({ label, value, onChange, presets, className }) {
  const list = presets ? DATE_PRESETS.filter(p => presets.includes(p.key)) : DATE_PRESETS;
  return (
    <FilterField label={label} className={className}>
      <select value={value.preset} onChange={e => onChange({ ...value, preset: e.target.value })} className={ctl}>
        {list.map(p => <option key={p.key || 'any'} value={p.key}>{p.label}</option>)}
      </select>
      {value.preset === 'custom' && (
        <div className="flex gap-1 mt-1">
          <input type="date" value={value.from || ''} onChange={e => onChange({ ...value, from: e.target.value })} className={ctl} />
          <input type="date" value={value.to || ''} onChange={e => onChange({ ...value, to: e.target.value })} className={ctl} />
        </div>
      )}
    </FilterField>
  );
}

export function RangeFilter({ label, value, onChange, placeholder = ['Min', 'Max'], className }) {
  return (
    <FilterField label={label} className={className}>
      <div className="flex gap-1">
        <input type="number" value={value.min} onChange={e => onChange({ ...value, min: e.target.value })} placeholder={placeholder[0]} className={ctl} />
        <input type="number" value={value.max} onChange={e => onChange({ ...value, max: e.target.value })} placeholder={placeholder[1]} className={ctl} />
      </div>
    </FilterField>
  );
}

export function inNumRange(v, r) {
  if (r.min !== '' && r.min != null && !(Number(v) >= Number(r.min))) return false;
  if (r.max !== '' && r.max != null && !(Number(v) <= Number(r.max))) return false;
  return true;
}

// Chip row (single select). options: [{ key, label, count? }]
export function Chips({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map(o => (
        <button
          key={o.key || 'all'}
          type="button"
          onClick={() => onChange(o.key)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${value === o.key ? 'bg-brand-primary text-white border-brand-primary' : 'border-slate-300 text-slate-600 bg-white hover:bg-slate-50'}`}
        >
          {o.label}{o.count != null && <span className={`ml-1 ${value === o.key ? 'text-white/80' : 'text-slate-400'}`}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

// Collapsible "More filters" shell with an active-filter counter and reset.
export function FilterPanel({ active, onReset, children, extra }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setOpen(o => !o)} className="text-sm font-semibold text-slate-700">
          {open ? '▾' : '▸'} Filters {active > 0 && <span className="ml-1 px-1.5 py-0.5 rounded bg-brand-primary text-white text-[11px]">{active} active</span>}
        </button>
        {active > 0 && <button type="button" onClick={onReset} className="text-xs text-rose-600 hover:underline">Reset all</button>}
        <div className="ml-auto flex flex-wrap items-center gap-2">{extra}</div>
      </div>
      {open && <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 mt-3">{children}</div>}
    </div>
  );
}

// Client-side paged table. columns: [{ key, header, render?(row), align?, sort?(row) }]
export function PagedTable({ columns, rows, pageSize = 25, empty = 'Nothing matches these filters', rowKey = 'id', onRow, initialSort }) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState(initialSort || null); // { key, dir }
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find(c => c.key === sort.key);
    if (!col) return rows;
    const get = col.sort || (r => r[col.key]);
    return [...rows].sort((a, b) => {
      const x = get(a); const y = get(b);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return sort.dir === 'asc' ? r : -r;
    });
  }, [rows, sort, columns]);
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const cur = Math.min(page, pages);
  const slice = sorted.slice((cur - 1) * pageSize, cur * pageSize);
  const toggle = key => setSort(s => (s && s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-left">
              {columns.map(c => (
                <th key={c.key} className={`px-3 py-2.5 font-semibold whitespace-nowrap ${c.align === 'right' ? 'text-right' : ''}`}>
                  {c.noSort ? c.header : (
                    <button type="button" onClick={() => toggle(c.key)} className="hover:text-slate-800">
                      {c.header}{sort?.key === c.key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {slice.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-slate-400">{empty}</td></tr>
            ) : slice.map((r, i) => (
              <tr key={typeof rowKey === 'function' ? rowKey(r) : (r[rowKey] ?? i)} onClick={onRow ? () => onRow(r) : undefined} className={`hover:bg-slate-50/70 ${onRow ? 'cursor-pointer' : ''}`}>
                {columns.map(c => (
                  <td key={c.key} className={`px-3 py-2.5 text-slate-700 ${c.align === 'right' ? 'text-right' : ''} ${c.className || ''}`}>
                    {c.render ? c.render(r) : (r[c.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 text-xs text-slate-500">
        <span>{sorted.length ? `${(cur - 1) * pageSize + 1}–${Math.min(cur * pageSize, sorted.length)} of ${sorted.length}` : '0 rows'}</span>
        {pages > 1 && (
          <div className="flex items-center gap-1">
            <button type="button" disabled={cur <= 1} onClick={() => setPage(cur - 1)} className="px-2 py-1 rounded border border-slate-300 disabled:opacity-40">Prev</button>
            <span className="px-1">{cur} / {pages}</span>
            <button type="button" disabled={cur >= pages} onClick={() => setPage(cur + 1)} className="px-2 py-1 rounded border border-slate-300 disabled:opacity-40">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function Pill({ children, tone = 'slate' }) {
  const map = {
    slate: 'bg-slate-100 text-slate-600', green: 'bg-emerald-100 text-emerald-700', red: 'bg-rose-100 text-rose-700',
    amber: 'bg-amber-100 text-amber-700', blue: 'bg-sky-100 text-sky-700', violet: 'bg-violet-100 text-violet-700',
  };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${map[tone] || map.slate}`}>{children}</span>;
}

export const PAYMENT_STATUS = {
  overdue: { label: 'Overdue', tone: 'red' },
  due_soon: { label: 'Due ≤ 7 days', tone: 'amber' },
  on_track: { label: 'On track', tone: 'blue' },
  completed: { label: 'Fully paid', tone: 'green' },
  no_plan: { label: 'No plan', tone: 'slate' },
  paid: { label: 'Paid', tone: 'green' },
  upcoming: { label: 'Upcoming', tone: 'slate' },
};

export function moneyCompact(v) { return inr(v, { compact: true }); }
