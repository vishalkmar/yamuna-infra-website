import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import FormModal, { Field, inputClass } from '../../components/FormModal';
import { fmtDateTime } from '../../lib/format';
import { Kpi, KpiGrid, FilterPanel, FilterField, SelectFilter, DateFilter, ctl, PagedTable, Pill } from '../../components/Dash';
import { presetRange, inRange, todayIST, exportCsv, uniq } from '../../lib/dash';

// Every SOS a resident raised: when, from which flat, and how the office
// responded (who, how fast, what was done).
const STATUS = { active: ['Active', 'red'], dispatched: ['Help dispatched', 'amber'], resolved: ['Resolved', 'green'], cancelled: ['Cancelled', 'slate'] };
const D = { preset: '', from: '', to: '' };
const EMPTY = { q: '', status: '', date: D, project: '', speed: '' };
const dur = s => (s == null ? '—' : s < 60 ? `${s}s` : s < 3600 ? `${Math.round(s / 60)} min` : `${(s / 3600).toFixed(1)} h`);
const room = r => [r.projectName, r.tower && `Tower ${r.tower}`, r.floor != null && r.floor !== '' && `Floor ${r.floor}`, r.flatNo && `Flat ${r.flatNo}`].filter(Boolean).join(' · ') || '—';

export default function SosLog() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState(EMPTY);
  const [respond, setRespond] = useState(null);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/admin/sos/alerts'); setRows(data.data); }
    catch (e) { toast.error(apiError(e, 'Could not load SOS log')); } finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const today = todayIST();
  const range = presetRange(f.date.preset, f.date);
  const q = f.q.trim().toLowerCase();
  const shown = useMemo(() => rows.filter(r => {
    if (f.status && r.status !== f.status) return false;
    if (f.project && r.projectName !== f.project) return false;
    if (range && !inRange(r.createdAt, range)) return false;
    if (f.speed === 'fast' && !(r.responseSecs != null && r.responseSecs <= 300)) return false;
    if (f.speed === 'slow' && !(r.responseSecs != null && r.responseSecs > 300)) return false;
    if (f.speed === 'none' && r.responseSecs != null) return false;
    if (q && ![r.name, r.phone, r.flatNo, r.tower, r.projectName, r.ackBy, r.responseNote, r.notes].join(' ').toLowerCase().includes(q)) return false;
    return true;
  }), [rows, f, range, q]);

  const answered = rows.filter(r => r.responseSecs != null);
  const avg = answered.length ? Math.round(answered.reduce((s, r) => s + Number(r.responseSecs), 0) / answered.length) : null;
  const active = Object.entries(f).filter(([k, v]) => (k === 'date' ? v.preset : v)).length;

  const columns = [
    { key: 'createdAt', header: 'Raised at', render: r => <span className="text-xs whitespace-nowrap">{fmtDateTime(r.createdAt)}</span> },
    { key: 'name', header: 'Resident', render: r => (
      <div><Link to={`/users/${r.userId}`} className="text-brand-primary font-medium hover:underline">{r.name || `#${r.userId}`}</Link>
        <div className="text-xs text-slate-400">{r.phone}</div></div>
    ) },
    { key: 'flatNo', header: 'From (flat / room)', render: r => <span className="text-xs">{room(r)}</span> },
    { key: 'lat', header: 'Location', noSort: true, render: r => (r.lat && r.lng
      ? <a href={`https://maps.google.com/?q=${r.lat},${r.lng}`} target="_blank" rel="noreferrer" className="text-xs text-brand-primary hover:underline">📍 Map</a> : '—') },
    { key: 'status', header: 'Status', render: r => { const s = STATUS[r.status] || [r.status, 'slate']; return <Pill tone={s[1]}>{s[0]}</Pill>; } },
    { key: 'ackBy', header: 'Responded by', render: r => r.ackBy || '—' },
    { key: 'responseSecs', header: 'Response time', align: 'right', sort: r => r.responseSecs, render: r => (
      <span className={r.responseSecs == null ? 'text-rose-600 font-semibold' : r.responseSecs > 300 ? 'text-amber-600' : 'text-emerald-700'}>{r.responseSecs == null ? 'Not yet' : dur(r.responseSecs)}</span>
    ) },
    { key: 'responseNote', header: 'Admin response', render: r => <span className="text-xs text-slate-600">{r.responseNote || r.notes || '—'}</span> },
    { key: 'act', header: '', noSort: true, render: r => <button onClick={() => setRespond({ id: r.id, status: r.status === 'active' ? 'resolved' : r.status, note: r.responseNote || '' })} className="text-xs font-semibold text-brand-primary hover:underline">Respond</button> },
  ];

  async function saveResponse() {
    try {
      await api.post(`/admin/sos/alerts/${respond.id}/respond`, { status: respond.status, note: respond.note });
      toast.success('Response saved'); setRespond(null); load();
    } catch (e) { toast.error(apiError(e)); }
  }

  return (
    <div className="space-y-4 mb-8">
      <KpiGrid>
        <Kpi icon="🆘" label="Active now" value={rows.filter(r => r.status === 'active').length} tone="bad" onClick={() => set('status', f.status === 'active' ? '' : 'active')} active={f.status === 'active'} />
        <Kpi icon="📅" label="Today" value={rows.filter(r => String(r.createdAt).slice(0, 10) === today).length} />
        <Kpi icon="🗓️" label="This month" value={rows.filter(r => String(r.createdAt).slice(0, 7) === today.slice(0, 7)).length} />
        <Kpi icon="📊" label="Total SOS" value={rows.length} />
        <Kpi icon="✅" label="Resolved" value={rows.filter(r => r.status === 'resolved').length} tone="good" onClick={() => set('status', f.status === 'resolved' ? '' : 'resolved')} active={f.status === 'resolved'} />
        <Kpi icon="⏱️" label="Avg response" value={dur(avg)} sub={`${answered.length} answered`} tone="info" />
      </KpiGrid>
      <FilterPanel active={active} onReset={() => setF(EMPTY)} extra={<>
        <button onClick={() => exportCsv('sos-log.csv', [
          ['Raised at', r => r.createdAt], ['Resident', r => r.name], ['Phone', r => r.phone], ['From', r => room(r)], ['Status', r => r.status],
          ['Responded by', r => r.ackBy], ['Response (sec)', r => r.responseSecs], ['Response', r => r.responseNote], ['Lat', r => r.lat], ['Lng', r => r.lng],
        ], shown)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">⬇ Export CSV</button>
        <button onClick={load} className="px-3 py-1.5 rounded-lg bg-brand-primary text-white text-sm font-semibold">↻ Refresh</button>
      </>}>
        <FilterField label="Search" className="col-span-2"><input value={f.q} onChange={e => set('q', e.target.value)} placeholder="Name, phone, flat, tower, admin…" className={ctl} /></FilterField>
        <SelectFilter label="Status" value={f.status} onChange={v => set('status', v)} options={Object.entries(STATUS).map(([value, [label]]) => ({ value, label }))} />
        <DateFilter label="Date" value={f.date} onChange={v => set('date', v)} presets={['', 'today', 'yesterday', 'this_week', 'last_7', 'this_month', 'last_30', 'last_month', 'this_year', 'custom']} />
        <SelectFilter label="Project" value={f.project} onChange={v => set('project', v)} options={uniq(rows.map(r => r.projectName))} />
        <SelectFilter label="Response time" value={f.speed} onChange={v => set('speed', v)} options={[{ value: 'fast', label: 'Within 5 min' }, { value: 'slow', label: 'Over 5 min' }, { value: 'none', label: 'Not responded' }]} />
      </FilterPanel>
      <div className="text-xs text-slate-500">{loading ? 'Loading…' : `${shown.length} SOS alert(s)`}</div>
      <PagedTable columns={columns} rows={shown} initialSort={{ key: 'createdAt', dir: 'desc' }} empty="No SOS alerts" />

      <FormModal open={!!respond} title="Office response" onClose={() => setRespond(null)} onSubmit={saveResponse} submitLabel="Save response">
        {respond && (
          <>
            <Field label="Status">
              <select className={inputClass} value={respond.status} onChange={e => setRespond(r => ({ ...r, status: e.target.value }))}>
                {Object.entries(STATUS).map(([v, [l]]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="What was done"><textarea rows={4} className={inputClass} value={respond.note} onChange={e => setRespond(r => ({ ...r, note: e.target.value }))} placeholder="e.g. Guard reached flat in 3 min, ambulance called" /></Field>
          </>
        )}
      </FormModal>
    </div>
  );
}
