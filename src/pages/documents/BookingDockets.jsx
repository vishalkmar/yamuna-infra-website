import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { uploadDocketPdf } from '../../lib/uploads';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import FormModal from '../../components/FormModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { fmtDate, fmtDateTime } from '../../lib/format';
import {
  Kpi, KpiGrid, Panel, BarList, TrendBars, FilterPanel, FilterField, SelectFilter, DateFilter, ctl,
  PagedTable, Pill, Chips,
} from '../../components/Dash';
import { presetRange, inRange, groupBy, series, pct, shortDate, exportCsv, matchText, uniq, todayIST, daysBetween } from '../../lib/dash';

const D = { preset: '', from: '', to: '' };
const FILTERS = {
  q: '', uploaded: D, joined: D, coverage: '', account: '', kind: '', fileType: '', storage: '', project: '',
  tower: '', count: '', hasProperty: '', source: '', age: '',
};
const STORAGE = {
  database: { label: 'Saved (durable)', tone: 'green' },
  server: { label: 'Lost on redeploy — re-upload', tone: 'red' },
  cloudinary: { label: 'Cloudinary', tone: 'blue' },
  external: { label: 'External link', tone: 'slate' },
};
function storageOf(url) {
  if (/\/files\/[a-f0-9]{32}\//.test(url || '')) return 'database';
  if (/\/uploads\/documents\//.test(url || '')) return 'server';
  if (/cloudinary/.test(url || '')) return 'cloudinary';
  return 'external';
}

export default function BookingDockets() {
  const navigate = useNavigate();
  const toast = useToast();
  const [view, setView] = useState('residents');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [manage, setManage] = useState(null); // resident being managed
  const [f, setF] = useState(FILTERS);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/admin/crm/dockets', { timeout: 60000 });
      setData(res.data);
    } catch (e) { toast.error(apiError(e, 'Could not load dockets')); } finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const today = data?.today || todayIST();
  const docs = useMemo(() => (data?.documents || []).map(d => ({ ...d, storage: storageOf(d.url) })), [data]);
  const residents = useMemo(() => (data?.residents || []).map(r => ({
    ...r,
    projectList: (r.projects || '').split(',').map(x => x.trim()).filter(Boolean),
    towerList: (r.towers || '').split(',').map(x => x.trim()).filter(Boolean),
    atRisk: docs.some(d => d.userId === r.id && d.storage === 'server'),
  })), [data, docs]);
  const resById = useMemo(() => new Map(residents.map(r => [r.id, r])), [residents]);

  const ranges = useMemo(() => ({
    up: presetRange(f.uploaded.preset, f.uploaded, today),
    joined: presetRange(f.joined.preset, f.joined, today),
  }), [f.uploaded, f.joined, today]);

  // Residents view
  const resRows = useMemo(() => residents.filter(r => {
    if (!matchText(r, f.q, ['name', 'email', 'mobile', 'projects', 'towers'])) return false;
    if (f.coverage && (f.coverage === 'yes') !== (r.docketCount > 0)) return false;
    if (f.account && (f.account === 'active') !== r.isActive) return false;
    if (f.project && !r.projectList.includes(f.project)) return false;
    if (f.tower && !r.towerList.includes(f.tower)) return false;
    if (f.count === '0' && r.docketCount !== 0) return false;
    if (f.count === '1' && r.docketCount !== 1) return false;
    if (f.count === '2+' && r.docketCount < 2) return false;
    if (f.hasProperty && (f.hasProperty === 'yes') !== (r.propertyCount > 0)) return false;
    if (f.source && r.createdSource !== f.source) return false;
    if (ranges.joined && !inRange(r.createdAt, ranges.joined)) return false;
    if (ranges.up && !inRange(r.lastUploadAt, ranges.up)) return false;
    if (f.storage === 'server' && !r.atRisk) return false;
    if (f.age === 'new_missing' && !(r.docketCount === 0 && daysBetween(today, r.createdAt) <= 30)) return false;
    if (f.age === 'old_missing' && !(r.docketCount === 0 && daysBetween(today, r.createdAt) > 30)) return false;
    return true;
  }), [residents, f, ranges, today]);

  // Documents view
  const docRows = useMemo(() => docs.filter(d => {
    const r = resById.get(d.userId) || {};
    if (!matchText(d, f.q, ['title', 'residentName', 'residentEmail', 'residentMobile'])) return false;
    if (ranges.up && !inRange(d.createdAt, ranges.up)) return false;
    if (ranges.joined && !inRange(r.createdAt, ranges.joined)) return false;
    if (f.account && (f.account === 'active') !== d.isActive) return false;
    if (f.kind && d.kind !== f.kind) return false;
    if (f.fileType && d.fileType !== f.fileType) return false;
    if (f.storage && d.storage !== f.storage) return false;
    if (f.project && !(r.projectList || []).includes(f.project)) return false;
    if (f.tower && !(r.towerList || []).includes(f.tower)) return false;
    if (f.source && r.createdSource !== f.source) return false;
    if (f.hasProperty && (f.hasProperty === 'yes') !== ((r.propertyCount || 0) > 0)) return false;
    return true;
  }), [docs, resById, f, ranges]);

  const k = useMemo(() => {
    const inP = p => docs.filter(d => inRange(d.createdAt, presetRange(p, {}, today))).length;
    const withDocket = residents.filter(r => r.docketCount > 0);
    const latest = docs[0];
    return {
      docs: docs.length,
      residents: residents.length,
      covered: withDocket.length,
      missing: residents.length - withDocket.length,
      coverage: pct(withDocket.length, residents.length),
      today: inP('today'),
      week: inP('this_week'),
      month: inP('this_month'),
      year: inP('this_year'),
      last30: inP('last_30'),
      avg: withDocket.length ? (docs.filter(d => d.kind === 'booking_docket').length / withDocket.length).toFixed(1) : '—',
      multi: residents.filter(r => r.docketCount > 1).length,
      atRisk: docs.filter(d => d.storage === 'server').length,
      pdf: docs.filter(d => d.fileType === 'pdf').length,
      images: docs.filter(d => d.fileType === 'image').length,
      newMissing: residents.filter(r => r.docketCount === 0 && daysBetween(today, r.createdAt) <= 30).length,
      ownersMissing: residents.filter(r => r.propertyCount > 0 && r.docketCount === 0).length,
      blockedWith: residents.filter(r => !r.isActive && r.docketCount > 0).length,
      latest,
    };
  }, [docs, residents, today]);

  const charts = useMemo(() => ({
    monthly: series(docs, d => d.createdAt, { by: 'month', months: 12, today }),
    daily: series(docs, d => d.createdAt, { by: 'day', days: 30, today }),
    kinds: groupBy(docs, d => (d.kind === 'booking_docket' ? 'Booking docket' : d.kind)),
    byProject: (() => {
      const out = new Map();
      for (const r of residents) {
        for (const p of (r.projectList.length ? r.projectList : ['No project'])) {
          const cur = out.get(p) || { label: p, total: 0, covered: 0 };
          cur.total += 1; if (r.docketCount > 0) cur.covered += 1;
          out.set(p, cur);
        }
      }
      return [...out.values()].map(x => ({ label: x.label, value: Math.round((x.covered / x.total) * 100), covered: x.covered, total: x.total }));
    })(),
    storage: groupBy(docs, d => STORAGE[d.storage]?.label || d.storage),
  }), [docs, residents, today]);

  const activeCount = Object.keys(FILTERS).reduce((n, key) => n + (JSON.stringify(f[key]) !== JSON.stringify(FILTERS[key]) ? 1 : 0), 0);
  const projects = uniq(residents.flatMap(r => r.projectList));
  const towers = uniq(residents.flatMap(r => r.towerList));
  const pick = (key, v) => setF(p => ({ ...p, [key]: p[key] === v ? '' : v }));

  function exportView() {
    if (view === 'residents') {
      exportCsv(`docket-coverage-${today}.csv`, [
        { header: 'Resident', value: r => r.name }, { header: 'Email', value: r => r.email }, { header: 'Phone', value: r => r.mobile },
        { header: 'Status', value: r => (r.isActive ? 'Active' : 'Blocked') }, { header: 'Projects', value: r => r.projects },
        { header: 'Dockets', value: r => r.docketCount }, { header: 'All documents', value: r => r.documentCount },
        { header: 'Last upload', value: r => r.lastUploadAt }, { header: 'Joined', value: r => String(r.createdAt || '').slice(0, 10) },
      ], resRows);
    } else {
      exportCsv(`dockets-${today}.csv`, [
        { header: 'Title', value: d => d.title }, { header: 'Resident', value: d => d.residentName }, { header: 'Email', value: d => d.residentEmail },
        { header: 'Phone', value: d => d.residentMobile }, { header: 'Kind', value: d => d.kind }, { header: 'File type', value: d => d.fileType },
        { header: 'Storage', value: d => STORAGE[d.storage]?.label }, { header: 'Uploaded', value: d => d.createdAt }, { header: 'URL', value: d => d.url },
      ], docRows);
    }
  }

  const resColumns = [
    { key: 'name', header: 'Resident', render: r => (
      <button onClick={e => { e.stopPropagation(); navigate(`/users/${r.id}`); }} className="text-left">
        <div className="font-medium text-slate-800 hover:underline">{r.name || '—'} {!r.isActive && <Pill tone="red">Blocked</Pill>}</div>
        <div className="text-xs text-slate-400">{r.projects || 'No property'}{r.towers ? ` · ${r.towers}` : ''}</div>
      </button>
    ) },
    { key: 'email', header: 'Email', render: r => <span className="text-slate-600">{r.email || '—'}</span> },
    { key: 'mobile', header: 'Phone' },
    { key: 'docketCount', header: 'Dockets', align: 'right', render: r => (r.docketCount
      ? <Pill tone={r.atRisk ? 'red' : 'green'}>📘 {r.docketCount}{r.atRisk ? ' · re-upload' : ''}</Pill>
      : <Pill tone="amber">Missing</Pill>) },
    { key: 'lastUploadAt', header: 'Last upload', render: r => (r.lastUploadAt ? shortDate(r.lastUploadAt) : '—') },
    { key: 'createdAt', header: 'Joined', render: r => <span className="text-slate-500">{shortDate(r.createdAt)}</span> },
    { key: 'manage', header: '', noSort: true, render: r => <button onClick={e => { e.stopPropagation(); setManage(r); }} className="text-brand-primary font-semibold hover:underline">{r.docketCount ? 'Manage' : '+ Upload'}</button> },
  ];
  const docColumns = [
    { key: 'title', header: 'Document', render: d => (
      <div><div className="font-medium text-slate-800">{d.fileType === 'image' ? '🖼️' : '📄'} {d.title}</div>
        <div className="text-xs text-slate-400">{d.kind === 'booking_docket' ? 'Booking docket' : d.kind}</div></div>
    ) },
    { key: 'residentName', header: 'Resident', render: d => (
      <button onClick={() => navigate(`/users/${d.userId}`)} className="text-left">
        <div className="hover:underline">{d.residentName || '—'}</div><div className="text-xs text-slate-400">{d.residentMobile}</div>
      </button>
    ) },
    { key: 'residentEmail', header: 'Email', render: d => <span className="text-slate-600">{d.residentEmail || '—'}</span> },
    { key: 'createdAt', header: 'Uploaded', render: d => <span className="whitespace-nowrap">{fmtDateTime(d.createdAt)}</span> },
    { key: 'storage', header: 'Storage', render: d => <Pill tone={STORAGE[d.storage]?.tone}>{STORAGE[d.storage]?.label}</Pill> },
    { key: 'open', header: '', noSort: true, render: d => (
      <div className="flex gap-3 justify-end whitespace-nowrap">
        <a href={d.url} target="_blank" rel="noreferrer" className="text-brand-primary font-semibold hover:underline">Open</a>
        <button onClick={() => setManage(resById.get(d.userId) || { id: d.userId, name: d.residentName })} className="text-slate-600 font-semibold hover:underline">Manage</button>
      </div>
    ) },
  ];

  return (
    <div>
      <PageHeader title="Booking Dockets" subtitle="Upload booking docket PDFs per resident — shown in their app">
        <button onClick={load} className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">↻ Refresh</button>
      </PageHeader>

      {k.atRisk > 0 && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          ⚠️ <b>{k.atRisk} docket file(s) were stored on the old server disk and are no longer available</b> (the hosting wipes that disk on every deploy).
          Please re-upload them — new uploads are saved permanently in the database.
          <button onClick={() => { setView('documents'); set('storage', 'server'); }} className="ml-2 underline font-semibold">Show them</button>
        </div>
      )}

      <KpiGrid>
        <Kpi icon="📘" label="Total documents" value={k.docs} sub={`${k.pdf} PDF · ${k.images} image`} />
        <Kpi icon="✅" label="Residents covered" value={k.covered} tone="good" sub={`of ${k.residents} residents`} onClick={() => pick('coverage', 'yes')} active={f.coverage === 'yes'} />
        <Kpi icon="❗" label="Missing docket" value={k.missing} tone={k.missing ? 'warn' : 'muted'} onClick={() => { setView('residents'); pick('coverage', 'no'); }} active={f.coverage === 'no'} />
        <Kpi icon="📊" label="Coverage" value={k.coverage} tone="info" />
        <Kpi icon="📌" label="Uploaded today" value={k.today} onClick={() => set('uploaded', f.uploaded.preset === 'today' ? D : { ...D, preset: 'today' })} active={f.uploaded.preset === 'today'} />
        <Kpi icon="🗓️" label="This week" value={k.week} onClick={() => set('uploaded', f.uploaded.preset === 'this_week' ? D : { ...D, preset: 'this_week' })} active={f.uploaded.preset === 'this_week'} />
        <Kpi icon="📅" label="This month" value={k.month} onClick={() => set('uploaded', f.uploaded.preset === 'this_month' ? D : { ...D, preset: 'this_month' })} active={f.uploaded.preset === 'this_month'} />
        <Kpi icon="📆" label="This year" value={k.year} onClick={() => set('uploaded', f.uploaded.preset === 'this_year' ? D : { ...D, preset: 'this_year' })} active={f.uploaded.preset === 'this_year'} />
        <Kpi icon="⏱️" label="Last 30 days" value={k.last30} />
        <Kpi icon="➗" label="Avg dockets / resident" value={k.avg} />
        <Kpi icon="📚" label="Residents with 2+" value={k.multi} onClick={() => pick('count', '2+')} active={f.count === '2+'} />
        <Kpi icon="🏠" label="Owners without docket" value={k.ownersMissing} tone={k.ownersMissing ? 'warn' : 'muted'} sub="Has property, no docket" />
        <Kpi icon="🆕" label="New residents missing" value={k.newMissing} tone={k.newMissing ? 'warn' : 'muted'} sub="Joined ≤ 30 days" onClick={() => { setView('residents'); pick('age', 'new_missing'); }} active={f.age === 'new_missing'} />
        <Kpi icon="🧯" label="Files to re-upload" value={k.atRisk} tone={k.atRisk ? 'bad' : 'good'} onClick={() => { setView('documents'); pick('storage', 'server'); }} active={f.storage === 'server'} />
        <Kpi icon="🚫" label="Blocked with docket" value={k.blockedWith} tone="muted" />
        <Kpi icon="🕘" label="Latest upload" value={k.latest ? shortDate(k.latest.createdAt) : '—'} sub={k.latest ? `${k.latest.residentName || ''} · ${k.latest.title}` : ''} />
      </KpiGrid>


      <div className="flex flex-wrap items-center gap-2 mt-5 mb-3">
        <Chips value={view} onChange={setView} options={[{ key: 'residents', label: '👥 Residents & coverage', count: resRows.length }, { key: 'documents', label: '📄 All documents', count: docRows.length }]} />
      </div>

      <FilterPanel active={activeCount} onReset={() => setF(FILTERS)} extra={<button onClick={exportView} className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">⬇ Export CSV</button>}>
        <FilterField label="Search" className="col-span-2">
          <input value={f.q} onChange={e => set('q', e.target.value)} placeholder="Name, email, phone, document title…" className={ctl} />
        </FilterField>
        <DateFilter label="Uploaded" value={f.uploaded} onChange={v => set('uploaded', v)} presets={['', 'today', 'yesterday', 'this_week', 'last_7', 'this_month', 'last_30', 'last_month', 'this_quarter', 'this_year', 'last_year', 'custom']} />
        <DateFilter label="Resident joined" value={f.joined} onChange={v => set('joined', v)} presets={['', 'today', 'this_week', 'this_month', 'last_30', 'this_quarter', 'this_year', 'last_year', 'custom']} />
        <SelectFilter label="Docket status" value={f.coverage} onChange={v => set('coverage', v)} options={[{ value: 'yes', label: 'Uploaded' }, { value: 'no', label: 'Missing' }]} />
        <SelectFilter label="No. of dockets" value={f.count} onChange={v => set('count', v)} options={[{ value: '0', label: 'None' }, { value: '1', label: 'Exactly 1' }, { value: '2+', label: '2 or more' }]} />
        <SelectFilter label="Resident status" value={f.account} onChange={v => set('account', v)} options={[{ value: 'active', label: 'Active' }, { value: 'blocked', label: 'Blocked' }]} />
        <SelectFilter label="Project" value={f.project} onChange={v => set('project', v)} options={projects} />
        <SelectFilter label="Tower" value={f.tower} onChange={v => set('tower', v)} options={towers} />
        <SelectFilter label="Has property" value={f.hasProperty} onChange={v => set('hasProperty', v)} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} />
        <SelectFilter label="Document type" value={f.kind} onChange={v => set('kind', v)} options={uniq(docs.map(d => d.kind)).map(x => ({ value: x, label: x === 'booking_docket' ? 'Booking docket' : x }))} />
        <SelectFilter label="File format" value={f.fileType} onChange={v => set('fileType', v)} options={[{ value: 'pdf', label: 'PDF' }, { value: 'image', label: 'Image' }, { value: 'other', label: 'Other' }]} />
        <SelectFilter label="Storage" value={f.storage} onChange={v => set('storage', v)} options={Object.entries(STORAGE).map(([value, s]) => ({ value, label: s.label }))} />
        <SelectFilter label="Onboarded via" value={f.source} onChange={v => set('source', v)} options={[{ value: 'admin', label: 'Admin portal' }, { value: 'app', label: 'App sign-up' }]} />
        <SelectFilter label="Follow-up" value={f.age} onChange={v => set('age', v)} options={[{ value: 'new_missing', label: 'New (≤30d), missing' }, { value: 'old_missing', label: 'Older than 30d, missing' }]} />
      </FilterPanel>

      {loading && !data ? <div className="text-slate-400 py-10 text-center">Loading…</div> : view === 'residents' ? (
        <PagedTable columns={resColumns} rows={resRows} onRow={r => setManage(r)} empty="No residents match these filters." />
      ) : (
        <PagedTable columns={docColumns} rows={docRows} initialSort={{ key: 'createdAt', dir: 'desc' }} empty="No documents match these filters." />
      )}

      <DocketManager resident={manage} onClose={() => setManage(null)} onChanged={load} />
    </div>
  );
}

function DocketManager({ resident, onClose, onChanged }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!resident) return;
    setLoading(true);
    try {
      const { data } = await api.get('/admin/documents', { params: { userId: resident.id, kind: 'booking_docket' } });
      setDocs(data.data);
    } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [resident, toast]);

  useEffect(() => { if (resident) load(); }, [resident, load]);

  // One step: pick a PDF → it uploads AND saves the docket. No title, no URL.
  async function pickFile(file) {
    if (!file) return;
    setUploading(true);
    try {
      const list = await uploadDocketPdf(file, { userId: resident.id, kind: 'booking_docket' });
      setDocs(list);
      toast.success('Docket uploaded ✓');
      onChanged && onChanged();
    } catch (e) {
      toast.error(apiError(e, 'Upload failed — please try another PDF'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = ''; // allow re-picking the same file
    }
  }

  async function doDelete() {
    setBusy(true);
    try {
      const { data } = await api.delete(`/admin/documents/${del.id}`);
      setDocs(data.data); setDel(null);
      toast.success('Removed'); onChanged && onChanged();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  return (
    <>
      <FormModal
        open={!!resident}
        wide
        title={resident ? `Booking dockets · ${resident.name || resident.mobile}` : ''}
        onClose={onClose}
        onSubmit={onClose}
        submitLabel="Done"
      >
        <div className="rounded-lg border border-slate-200 p-4">
          <span className="block text-sm font-bold text-slate-700 mb-1">Upload a booking docket (PDF)</span>
          <p className="text-xs text-slate-400 mb-3">Just pick a PDF — it uploads and saves automatically.</p>
          <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={e => pickFile(e.target.files?.[0])} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50">
            {uploading ? 'Uploading…' : '📎 Choose PDF & Upload'}
          </button>
        </div>

        <div>
          <span className="block text-sm font-bold text-slate-700 mb-2">Existing dockets ({docs.length})</span>
          {loading ? <p className="text-sm text-slate-400">Loading…</p>
            : docs.length === 0 ? <p className="text-sm text-slate-400">No dockets uploaded yet.</p>
            : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {docs.map(d => (
                  <div key={d.id} className="flex items-center justify-between px-3 py-2">
                    <div>
                      <div className="text-sm font-medium text-slate-800">📄 {d.title}</div>
                      <div className="text-xs text-slate-400">{fmtDate(d.createdAt)}</div>
                    </div>
                    <div className="flex gap-3 text-xs">
                      <a href={d.url} target="_blank" rel="noreferrer" className="text-brand-primary font-semibold hover:underline">Open</a>
                      <button type="button" onClick={() => setDel(d)} className="text-rose-600 font-semibold hover:underline">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </FormModal>

      <ConfirmDialog
        open={!!del}
        title="Delete docket?"
        message={`Remove “${del?.title || ''}” from this resident?`}
        confirmLabel="Delete" danger busy={busy}
        onCancel={() => setDel(null)} onConfirm={doDelete}
      />
    </>
  );
}
