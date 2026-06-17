// Small display helpers shared across modules.

export function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value.replace ? value.replace(' ', 'T') : value);
  if (isNaN(d)) return value;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(value) {
  if (!value) return '—';
  const d = new Date(value.replace ? value.replace(' ', 'T') : value);
  if (isNaN(d)) return value;
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function fmtMoney(n) {
  if (n == null || n === '') return '—';
  return '₹' + Number(n).toLocaleString('en-IN');
}
