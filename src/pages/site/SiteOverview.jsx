import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import FormModal, { Field, inputClass } from '../../components/FormModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import MediaDropzone, { MediaTile } from '../../components/MediaDropzone';
import { fmtDate } from '../../lib/format';

// Site Overview — one page per project (Inventory property). Residents see the
// site of the project their property is linked to: descriptions, photos,
// videos, map, progress and posts. Posting notifies only that project's
// residents (in-app + push + live).
const EMPTY = { shortDesc: '', longDesc: '', address: '', mapUrl: '', progressPercent: 0, progressNote: '' };

export default function SiteOverview() {
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const projectId = params.get('project') || '';
  const [projects, setProjects] = useState(null);
  const [site, setSite] = useState(null);
  const [cfg, setCfg] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [postOpen, setPostOpen] = useState(false);
  const [del, setDel] = useState(null); // { kind: 'media'|'posts', id }
  const [busy, setBusy] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/site/projects');
      setProjects(data.data);
      if (!projectId && data.data.length) setParams({ project: String(data.data[0].id) }, { replace: true });
    } catch (e) { toast.error(apiError(e)); setProjects([]); }
  }, [projectId, setParams, toast]);
  useEffect(() => { loadProjects(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSite = useCallback(async () => {
    if (!projectId) return;
    setSite(null);
    try {
      const { data } = await api.get(`/admin/site/project/${projectId}`);
      setSite(data.data);
      setCfg({ ...EMPTY, ...data.data.config });
    } catch (e) { toast.error(apiError(e)); }
  }, [projectId, toast]);
  useEffect(() => { loadSite(); }, [loadSite]);

  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }));
  const project = projects?.find(p => String(p.id) === String(projectId));

  async function save() {
    setSaving(true);
    try {
      const { data } = await api.put(`/admin/site/project/${projectId}`, {
        shortDesc: cfg.shortDesc, longDesc: cfg.longDesc, address: cfg.address, mapUrl: cfg.mapUrl || null,
        progressPercent: Number(cfg.progressPercent) || 0, progressNote: cfg.progressNote,
      });
      setSite(data.data); toast.success('Site details saved'); loadProjects();
    } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); }
  }

  async function addMedia(items) {
    try {
      const { data } = await api.post(`/admin/site/project/${projectId}/media`, { items });
      setSite(data.data); toast.success(`${items.length} item(s) added — residents notified`); loadProjects();
    } catch (e) { toast.error(apiError(e)); }
  }

  async function doDelete() {
    setBusy(true);
    try {
      await api.delete(`/admin/site/${del.kind}/${del.id}`);
      setDel(null); toast.success('Removed'); loadSite(); loadProjects();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  if (!projects) return <div className="text-slate-400">Loading…</div>;
  if (!projects.length) {
    return (
      <div>
        <PageHeader title="Site Overview" subtitle="One page per property / project" />
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
          No properties yet. Add one in <button onClick={() => navigate('/agents/inventory')} className="text-brand-primary font-semibold hover:underline">Inventory</button> first — then its site page appears here.
        </div>
      </div>
    );
  }

  const images = site?.media.filter(m => m.type === 'image').length || 0;
  const videos = (site?.media.length || 0) - images;

  return (
    <div>
      <PageHeader title="Site Overview" subtitle="Each property has its own site page. Residents linked to that property see it in the app." />

      {/* 1 — choose the property */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Select property / project">
            <select className={`${inputClass} min-w-[280px]`} value={projectId} onChange={e => setParams({ project: e.target.value })}>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}{p.city ? ` · ${p.city}` : ''} — {p.residentCount} resident(s)</option>)}
            </select>
          </Field>
          {project && (
            <div className="flex flex-wrap gap-2 text-xs pb-3">
              <span className="px-2.5 py-1 rounded-full bg-sky-100 text-sky-700 font-semibold">👥 {project.residentCount} linked resident(s) see this</span>
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold">🖼️ {project.mediaCount} media</span>
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold">📝 {project.postCount} post(s)</span>
              {!project.residentCount && <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold">No resident is linked to this property yet</span>}
            </div>
          )}
        </div>
      </div>

      {!site ? <div className="text-slate-400">Loading site…</div> : (
        <>
          {/* 2 — details */}
          <section className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
            <h3 className="font-bold text-slate-800 mb-3">About {site.project.name}</h3>
            <Field label="Short description" hint="One or two lines shown at the top of the site page">
              <input className={inputClass} maxLength={300} value={cfg.shortDesc} onChange={e => set('shortDesc', e.target.value)} placeholder="Premium 2 & 3 BHK homes near Prem Mandir, Vrindavan" />
            </Field>
            <Field label="Long description" hint="Full details — amenities, specifications, location advantages…">
              <textarea rows={6} className={inputClass} value={cfg.longDesc} onChange={e => set('longDesc', e.target.value)} />
            </Field>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Address"><input className={inputClass} value={cfg.address} onChange={e => set('address', e.target.value)} /></Field>
              <Field label="Google Maps link" hint="Paste the Google Maps share URL"><input className={inputClass} value={cfg.mapUrl} onChange={e => set('mapUrl', e.target.value)} placeholder="https://maps.app.goo.gl/…" /></Field>
              <Field label="Construction progress %">
                <div className="flex items-center gap-3">
                  <input type="range" min="0" max="100" value={cfg.progressPercent} onChange={e => set('progressPercent', e.target.value)} className="flex-1" />
                  <input className={`${inputClass} w-20`} value={cfg.progressPercent} onChange={e => set('progressPercent', e.target.value.replace(/[^\d]/g, '').slice(0, 3))} />
                </div>
              </Field>
              <Field label="Progress note"><input className={inputClass} value={cfg.progressNote} onChange={e => set('progressNote', e.target.value)} placeholder="e.g. Tower B 8th floor slab in progress" /></Field>
            </div>
            <button onClick={save} disabled={saving} className="mt-2 px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold disabled:opacity-60">{saving ? 'Saving…' : 'Save details'}</button>
          </section>

          {/* 3 — gallery */}
          <section className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
            <h3 className="font-bold text-slate-800 mb-1">Photos & videos <span className="text-slate-400 font-normal text-sm">({images} photos · {videos} videos)</span></h3>
            <p className="text-xs text-slate-400 mb-3">Residents can open photos full-screen and play videos in the app. Adding media notifies this property's residents.</p>
            {site.media.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
                {site.media.map(m => <MediaTile key={m.id} m={m} onRemove={() => setDel({ kind: 'media', id: m.id })} />)}
              </div>
            )}
            <MediaDropzone onAdd={addMedia} label={`Site · ${site.project.name}`} />
          </section>

          {/* 4 — posts */}
          <section className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800">Progress posts <span className="text-slate-400 font-normal text-sm">({site.updates.length})</span></h3>
              <button onClick={() => setPostOpen(true)} className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold">+ Post update</button>
            </div>
            {site.updates.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400">No posts for this property yet.</div>
            ) : (
              <div className="space-y-3">
                {site.updates.map(u => (
                  <div key={u.id} className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-800">{u.title}</div>
                        <div className="text-xs text-slate-400">{fmtDate(u.postedAt)} · {u.media.length} attachment(s)</div>
                      </div>
                      <button onClick={() => setDel({ kind: 'posts', id: u.id })} className="text-rose-600 text-sm font-semibold hover:underline">Delete</button>
                    </div>
                    {u.description && <p className="text-sm text-slate-600 mt-2 whitespace-pre-line">{u.description}</p>}
                    {u.media.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-2 mt-3">
                        {u.media.map((m, i) => <MediaTile key={i} m={m} size="h-20" />)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <PostModal open={postOpen} projects={projects} defaultProject={projectId} onClose={() => setPostOpen(false)}
        onDone={pid => { setPostOpen(false); if (String(pid) !== String(projectId)) setParams({ project: String(pid) }); else loadSite(); loadProjects(); }} />
      <ConfirmDialog open={!!del} title="Remove?" message="This removes it from the residents' app." confirmLabel="Remove" danger busy={busy} onConfirm={doDelete} onCancel={() => setDel(null)} />
    </div>
  );
}

function PostModal({ open, projects, defaultProject, onClose, onDone }) {
  const toast = useToast();
  const [f, setF] = useState({ projectId: '', title: '', description: '', media: [] });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setF({ projectId: defaultProject, title: '', description: '', media: [] }); }, [open, defaultProject]);
  const p = projects.find(x => String(x.id) === String(f.projectId));

  async function submit() {
    if (!f.projectId) { toast.error('Select the property this post is for'); return; }
    if (!f.title.trim()) { toast.error('Title is required'); return; }
    setBusy(true);
    try {
      await api.post(`/admin/site/project/${f.projectId}/posts`, { title: f.title.trim(), description: f.description, media: f.media });
      toast.success(`Posted — ${p?.residentCount || 0} resident(s) notified`);
      onDone(f.projectId);
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  return (
    <FormModal open={open} title="Post site update" onClose={onClose} onSubmit={submit} submitting={busy} submitLabel="Post & notify" wide>
      <Field label="For which property?" required>
        <select className={inputClass} value={f.projectId} onChange={e => setF(x => ({ ...x, projectId: e.target.value }))}>
          <option value="">Select property…</option>
          {projects.map(x => <option key={x.id} value={x.id}>{x.name} — {x.residentCount} resident(s)</option>)}
        </select>
      </Field>
      <Field label="Title" required><input className={inputClass} value={f.title} onChange={e => setF(x => ({ ...x, title: e.target.value }))} placeholder="e.g. Tower B — 8th floor slab cast" /></Field>
      <Field label="Description"><textarea rows={4} className={inputClass} value={f.description} onChange={e => setF(x => ({ ...x, description: e.target.value }))} /></Field>
      <Field label={`Photos & videos (${f.media.length})`}>
        {f.media.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
            {f.media.map((m, i) => <MediaTile key={i} m={m} size="h-20" onRemove={() => setF(x => ({ ...x, media: x.media.filter((_, j) => j !== i) }))} />)}
          </div>
        )}
        <MediaDropzone onAdd={items => setF(x => ({ ...x, media: [...x.media, ...items] }))} label="Site post" />
      </Field>
    </FormModal>
  );
}
