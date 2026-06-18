import React, { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import ImageUploader from '../../components/ImageUploader';
import FormModal, { Field, inputClass } from '../../components/FormModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { fmtDate } from '../../lib/format';

export default function SiteOverview() {
  const toast = useToast();
  const [config, setConfig] = useState({ title: '', address: '', mapUrl: '', progressPercent: 0, progressNote: '' });
  const [images, setImages] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingCfg, setSavingCfg] = useState(false);
  const [newImg, setNewImg] = useState('');
  const [updModal, setUpdModal] = useState(false);
  const [del, setDel] = useState(null); // {kind,id}
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/site/overview');
      setConfig({
        title: data.data.config.title || '', address: data.data.config.address || '',
        mapUrl: data.data.config.mapUrl || '', progressPercent: data.data.config.progressPercent ?? 0,
        progressNote: data.data.config.progressNote || '',
      });
      setImages(data.data.images);
      setUpdates(data.data.updates);
    } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function saveConfig() {
    setSavingCfg(true);
    try {
      await api.put('/admin/site/config', { ...config, progressPercent: Number(config.progressPercent) || 0 });
      toast.success('Site details saved');
    } catch (e) { toast.error(apiError(e)); } finally { setSavingCfg(false); }
  }

  async function addImage(url) {
    if (!url) return;
    try {
      const { data } = await api.post('/admin/site/images', { url });
      setImages(data.data); setNewImg('');
      toast.success('Image added');
    } catch (e) { toast.error(apiError(e)); }
  }

  async function doDelete() {
    setBusy(true);
    try {
      const { kind, id } = del;
      const { data } = await api.delete(`/admin/site/${kind}/${id}`);
      if (kind === 'images') setImages(data.data); else setUpdates(data.data);
      setDel(null); toast.success('Removed');
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const set = (k, v) => setConfig(p => ({ ...p, [k]: v }));
  if (loading) return <div className="text-slate-400">Loading…</div>;

  return (
    <div>
      <PageHeader title="Site Overview" subtitle="Shown to every resident — images, map, progress" />

      {/* Config */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5 max-w-2xl">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Site title"><input className={inputClass} value={config.title} onChange={e => set('title', e.target.value)} placeholder="Yamuna Heights" /></Field>
          <Field label="Overall progress %"><input className={inputClass} value={config.progressPercent} onChange={e => set('progressPercent', e.target.value.replace(/[^\d]/g, '').slice(0, 3))} /></Field>
        </div>
        <Field label="Address"><input className={inputClass} value={config.address} onChange={e => set('address', e.target.value)} /></Field>
        <Field label="Google Maps link" hint="Paste the Google Maps share URL"><input className={inputClass} value={config.mapUrl} onChange={e => set('mapUrl', e.target.value)} placeholder="https://maps.google.com/?q=..." /></Field>
        <Field label="Progress note"><textarea rows={2} className={inputClass} value={config.progressNote} onChange={e => set('progressNote', e.target.value)} placeholder="e.g. Tower B 8th floor slab in progress" /></Field>
        <button onClick={saveConfig} disabled={savingCfg} className="mt-2 px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50">
          {savingCfg ? 'Saving…' : 'Save details'}
        </button>
      </div>

      {/* Images */}
      <h3 className="font-bold text-slate-800 mb-2">Site images ({images.length})</h3>
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
        {images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-3">
            {images.map(im => (
              <div key={im.id} className="relative">
                <img src={im.url} alt="" className="w-full h-24 object-cover rounded-lg border border-slate-200" />
                <button onClick={() => setDel({ kind: 'images', id: im.id })} className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full w-6 h-6 text-xs">✕</button>
              </div>
            ))}
          </div>
        )}
        <ImageUploader value={newImg} onChange={addImage} label="Add a site image" />
      </div>

      {/* Updates */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-slate-800">Progress updates ({updates.length})</h3>
        <button onClick={() => setUpdModal(true)} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-brand-primary hover:opacity-90">+ Post update</button>
      </div>
      {updates.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400">No updates yet.</div>
      ) : (
        <div className="space-y-2">
          {updates.map(u => (
            <div key={u.id} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
              {u.mediaUrl && <img src={u.mediaUrl} alt="" className="w-16 h-12 object-cover rounded" />}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800">{u.title}</div>
                {u.description && <div className="text-sm text-slate-500 truncate">{u.description}</div>}
                <div className="text-xs text-slate-400">{fmtDate(u.postedAt)}</div>
              </div>
              <button onClick={() => setDel({ kind: 'updates', id: u.id })} className="text-rose-600 text-sm font-semibold hover:underline">Delete</button>
            </div>
          ))}
        </div>
      )}

      <UpdateModal open={updModal} onClose={() => setUpdModal(false)} onSaved={setUpdates} />
      <ConfirmDialog open={!!del} title="Delete?" message="This cannot be undone." confirmLabel="Delete" danger busy={busy}
        onCancel={() => setDel(null)} onConfirm={doDelete} />
    </div>
  );
}

function UpdateModal({ open, onClose, onSaved }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ title: '', description: '', mediaUrl: '' });
  useEffect(() => { if (open) setF({ title: '', description: '', mediaUrl: '' }); }, [open]);

  async function submit() {
    if (!f.title.trim()) { toast.error('Title required'); return; }
    setBusy(true);
    try {
      const { data } = await api.post('/admin/site/updates', { title: f.title.trim(), description: f.description || null, mediaUrl: f.mediaUrl || null });
      onSaved(data.data); toast.success('Update posted'); onClose();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  return (
    <FormModal open={open} title="Post site update" onClose={onClose} onSubmit={submit} submitting={busy} submitLabel="Post">
      <Field label="Title" required><input className={inputClass} value={f.title} onChange={e => setF(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Tower B — 8th floor slab cast" /></Field>
      <Field label="Description"><textarea rows={3} className={inputClass} value={f.description} onChange={e => setF(p => ({ ...p, description: e.target.value }))} /></Field>
      <ImageUploader value={f.mediaUrl} onChange={v => setF(p => ({ ...p, mediaUrl: v }))} label="Photo" />
    </FormModal>
  );
}
