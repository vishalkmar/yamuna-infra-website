// Pure helpers shared by every dashboard: date presets, grouping, money
// formatting and CSV export. Dates are 'YYYY-MM-DD' strings in IST.

export function todayIST() {
  return new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
}

function shift(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}
function weekday(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
}
function monthStart(dateStr, offset = 0) {
  const [y, m] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + offset, 1));
  return dt.toISOString().slice(0, 10);
}
function monthEnd(dateStr, offset = 0) {
  return shift(monthStart(dateStr, offset + 1), -1);
}

// Presets for "when" filters. `future` ones are for due dates.
export const DATE_PRESETS = [
  { key: '', label: 'Any time' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'this_week', label: 'This week' },
  { key: 'last_7', label: 'Last 7 days' },
  { key: 'this_month', label: 'This month' },
  { key: 'last_30', label: 'Last 30 days' },
  { key: 'last_month', label: 'Last month' },
  { key: 'this_quarter', label: 'This quarter' },
  { key: 'this_year', label: 'This year' },
  { key: 'last_year', label: 'Last year' },
  { key: 'next_7', label: 'Next 7 days' },
  { key: 'next_30', label: 'Next 30 days' },
  { key: 'next_month', label: 'Next month' },
  { key: 'custom', label: 'Custom range…' },
];

// → { from, to } inclusive, or null for "any time".
export function presetRange(key, custom = {}, today = todayIST()) {
  switch (key) {
    case 'today': return { from: today, to: today };
    case 'yesterday': { const y = shift(today, -1); return { from: y, to: y }; }
    case 'this_week': { const back = (weekday(today) + 6) % 7; return { from: shift(today, -back), to: shift(today, 6 - back) }; }
    case 'last_7': return { from: shift(today, -6), to: today };
    case 'this_month': return { from: monthStart(today), to: monthEnd(today) };
    case 'last_30': return { from: shift(today, -29), to: today };
    case 'last_month': return { from: monthStart(today, -1), to: monthEnd(today, -1) };
    case 'this_quarter': {
      const [y, m] = today.split('-').map(Number);
      const qStart = Math.floor((m - 1) / 3) * 3 + 1;
      const from = `${y}-${String(qStart).padStart(2, '0')}-01`;
      return { from, to: monthEnd(from, 2) };
    }
    case 'this_year': return { from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` };
    case 'last_year': { const y = Number(today.slice(0, 4)) - 1; return { from: `${y}-01-01`, to: `${y}-12-31` }; }
    case 'next_7': return { from: today, to: shift(today, 6) };
    case 'next_30': return { from: today, to: shift(today, 29) };
    case 'next_month': return { from: monthStart(today, 1), to: monthEnd(today, 1) };
    case 'custom': return (custom.from || custom.to) ? { from: custom.from || '0000-01-01', to: custom.to || '9999-12-31' } : null;
    default: return null;
  }
}

export function inRange(dateLike, range) {
  if (!range) return true;
  if (!dateLike) return false;
  const d = String(dateLike).slice(0, 10);
  return d >= range.from && d <= range.to;
}

export function daysBetween(a, b) {
  if (!a || !b) return null;
  const [ay, am, ad] = String(a).slice(0, 10).split('-').map(Number);
  const [by, bm, bd] = String(b).slice(0, 10).split('-').map(Number);
  return Math.round((Date.UTC(ay, am - 1, ad) - Date.UTC(by, bm - 1, bd)) / 86400000);
}

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function weekdayOf(dateLike) { return dateLike ? WEEKDAYS[weekday(String(dateLike).slice(0, 10))] : null; }

// Count/sum rows by a key → [{ label, value, amount }], biggest first.
export function groupBy(rows, keyFn, { amount, limit, sort = true } = {}) {
  const map = new Map();
  for (const r of rows) {
    const raw = keyFn(r);
    const keys = Array.isArray(raw) ? raw : [raw];
    for (const k of keys) {
      const label = k == null || k === '' ? '—' : String(k);
      const cur = map.get(label) || { label, value: 0, amount: 0 };
      cur.value += 1;
      if (amount) cur.amount += Number(amount(r) || 0);
      map.set(label, cur);
    }
  }
  let out = [...map.values()];
  if (sort) out.sort((a, b) => b.value - a.value || b.amount - a.amount);
  if (limit) out = out.slice(0, limit);
  return out;
}

// Time buckets for trend charts ('day' over a window, or 'month').
export function series(rows, dateFn, { by = 'day', days = 30, months = 12, amount, today = todayIST() } = {}) {
  const buckets = [];
  if (by === 'day') {
    for (let i = days - 1; i >= 0; i--) buckets.push(shift(today, -i));
  } else {
    for (let i = months - 1; i >= 0; i--) buckets.push(monthStart(today, -i).slice(0, 7));
  }
  const map = new Map(buckets.map(b => [b, { label: b, value: 0, amount: 0 }]));
  for (const r of rows) {
    const d = dateFn(r);
    if (!d) continue;
    const k = by === 'day' ? String(d).slice(0, 10) : String(d).slice(0, 7);
    const cur = map.get(k);
    if (!cur) continue;
    cur.value += 1;
    if (amount) cur.amount += Number(amount(r) || 0);
  }
  return [...map.values()];
}

// Future months (for "dues forecast").
export function forwardSeries(rows, dateFn, amount, months = 6, today = todayIST()) {
  const buckets = [];
  for (let i = 0; i < months; i++) buckets.push(monthStart(today, i).slice(0, 7));
  const map = new Map(buckets.map(b => [b, { label: b, value: 0, amount: 0 }]));
  for (const r of rows) {
    const d = dateFn(r);
    if (!d) continue;
    const cur = map.get(String(d).slice(0, 7));
    if (!cur) continue;
    cur.value += 1;
    cur.amount += Number(amount(r) || 0);
  }
  return [...map.values()];
}

export function sum(rows, fn) { return rows.reduce((s, r) => s + Number(fn(r) || 0), 0); }

export function inr(n, { compact = false } = {}) {
  if (n == null || n === '' || Number.isNaN(Number(n))) return '—';
  const v = Number(n);
  if (compact) {
    const a = Math.abs(v);
    if (a >= 1e7) return `₹${(v / 1e7).toFixed(a >= 1e8 ? 0 : 2)} Cr`;
    if (a >= 1e5) return `₹${(v / 1e5).toFixed(a >= 1e6 ? 1 : 2)} L`;
    if (a >= 1e3) return `₹${(v / 1e3).toFixed(1)}K`;
  }
  return `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function pct(part, whole) {
  if (!whole) return '—';
  return `${Math.round((Number(part) / Number(whole)) * 100)}%`;
}

export function monthLabel(ym) {
  const [y, m] = String(ym).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

export function shortDate(d) {
  if (!d) return '—';
  const [y, m, day] = String(d).slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

// Download rows as CSV. columns: [{ header, value: row => any }]
export function exportCsv(filename, columns, rows) {
  const esc = v => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.map(c => esc(c.header)).join(',')];
  for (const r of rows) lines.push(columns.map(c => esc(c.value(r))).join(','));
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Case-insensitive "contains" across several fields.
export function matchText(row, text, fields) {
  if (!text) return true;
  const q = text.toLowerCase();
  return fields.some(f => String((typeof f === 'function' ? f(row) : row[f]) ?? '').toLowerCase().includes(q));
}

export function uniq(values) {
  return [...new Set(values.filter(v => v != null && v !== ''))].sort((a, b) => String(a).localeCompare(String(b)));
}
