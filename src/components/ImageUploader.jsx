import React, { useRef, useState } from 'react';
import { uploadImage, importImageByUrl, cloudinaryConfigured } from '../lib/cloudinary';
import { recordMedia, listMedia } from '../lib/media';

// Reusable image field used by every catalog form.
//   <ImageUploader value={url} onChange={setUrl} />
// Two ways to set an image: drag-drop / click to upload (Cloudinary), or paste a link.
export default function ImageUploader({ value, onChange, label = 'Image' }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [urlText, setUrlText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [lib, setLib] = useState(null); // { items } when picker open
  const [libSearch, setLibSearch] = useState('');
  const fileRef = useRef(null);
  const configured = cloudinaryConfigured();

  async function handleFile(file) {
    if (!file) return;
    if (!configured) { setError('Cloudinary not configured — paste an image URL instead.'); return; }
    setError(''); setBusy(true);
    try {
      const asset = await uploadImage(file);
      onChange(asset.url);
      recordMedia(asset, label); // add to Media Library
    } catch (e) {
      setError(e.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  async function openLibrary() {
    setLib({ items: [], loading: true });
    try {
      const data = await listMedia({ pageSize: 60 });
      setLib({ items: data.rows, loading: false });
    } catch {
      setLib({ items: [], loading: false });
    }
  }

  async function handleUrl() {
    const u = urlText.trim();
    if (!u) return;
    setError(''); setBusy(true);
    try {
      const url = await importImageByUrl(u);
      onChange(url);
      setUrlText('');
    } catch (e) {
      setError(e.message || 'Could not use that URL');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>

      {value ? (
        <div className="relative inline-block">
          <img src={value} alt="" className="h-28 w-28 object-cover rounded-lg border border-slate-200" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full w-6 h-6 text-xs leading-none"
            title="Remove"
          >✕</button>
        </div>
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
          className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition ${
            dragOver ? 'border-brand-primary bg-brand-primary/5' : 'border-slate-300 hover:border-slate-400'
          }`}
        >
          <div className="text-2xl">🖼️</div>
          <div className="text-sm text-slate-600 mt-1">
            {busy ? 'Uploading…' : configured ? 'Drag & drop or click to upload' : 'Paste an image URL below'}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => handleFile(e.target.files?.[0])}
          />
        </div>
      )}

      {/* Paste-a-link option (always available) */}
      <div className="flex gap-2 mt-2">
        <input
          value={urlText}
          onChange={e => setUrlText(e.target.value)}
          placeholder="…or paste image URL"
          className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
        />
        <button
          type="button"
          onClick={handleUrl}
          disabled={busy || !urlText.trim()}
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50 disabled:opacity-50"
        >Use</button>
        <button
          type="button"
          onClick={openLibrary}
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50"
        >Library</button>
      </div>

      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}

      {lib && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40" onClick={() => setLib(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-800">Media Library</h3>
              <input value={libSearch} onChange={e => setLibSearch(e.target.value)} placeholder="Filter…" className="text-sm border border-slate-300 rounded-lg px-3 py-1.5" />
              <button type="button" onClick={() => setLib(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            <div className="p-4 overflow-y-auto">
              {lib.loading ? (
                <div className="text-sm text-slate-400">Loading…</div>
              ) : lib.items.length === 0 ? (
                <div className="text-sm text-slate-400">No images yet. Upload one above.</div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {lib.items
                    .filter(a => !libSearch || (a.label || a.publicId || '').toLowerCase().includes(libSearch.toLowerCase()))
                    .map(a => (
                      <button key={a.id} type="button" onClick={() => { onChange(a.url); setLib(null); }} className="aspect-square rounded-lg overflow-hidden border border-slate-200 hover:ring-2 hover:ring-brand-primary">
                        <img src={a.url} alt={a.label || ''} className="w-full h-full object-cover" />
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
