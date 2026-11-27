import React, { useRef, useState } from 'react';
import { uploadImage, uploadVideo } from '../lib/cloudinary';
import { recordMedia } from '../lib/media';

// Drag-drop / click to upload several images & videos at once, or paste a
// link (image URL, mp4 URL, YouTube link). Calls onAdd([{ type, url, caption }]).
export const isVideoUrl = u => /(youtube\.com|youtu\.be)\//.test(u) || /\.(mp4|mov|m4v|webm|3gp)(\?|$)/i.test(u) || /\/video\/upload\//.test(u);
export function youtubeId(u) {
  const m = String(u || '').match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
  return m ? m[1] : null;
}
export function mediaThumb(m) {
  if (m.thumb) return m.thumb;
  if (m.type !== 'video') return m.url;
  const yt = youtubeId(m.url);
  if (yt) return `https://img.youtube.com/vi/${yt}/hqdefault.jpg`;
  if (/res\.cloudinary\.com\/.+\/video\/upload\//.test(m.url)) return m.url.replace(/\.(mp4|mov|m4v|webm|3gp)(\?.*)?$/i, '.jpg').replace('/video/upload/', '/video/upload/so_1/');
  return null;
}

export function MediaTile({ m, onRemove, size = 'h-28' }) {
  const thumb = mediaThumb(m);
  return (
    <div className={`relative ${size} rounded-lg overflow-hidden bg-slate-100 border border-slate-200 group`}>
      {thumb ? <img src={thumb} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-3xl">🎬</div>}
      {m.type === 'video' && (
        <a href={m.url} target="_blank" rel="noreferrer" className="absolute inset-0 grid place-items-center bg-black/25">
          <span className="w-10 h-10 rounded-full bg-white/90 grid place-items-center text-slate-800">▶</span>
        </a>
      )}
      {m.type === 'video' && <span className="absolute left-1.5 bottom-1.5 text-[10px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded">VIDEO</span>}
      {onRemove && (
        <button type="button" onClick={onRemove} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600 text-white text-xs opacity-90 hover:opacity-100">✕</button>
      )}
    </div>
  );
}

export default function MediaDropzone({ onAdd, label = 'Add photos / videos' }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [link, setLink] = useState('');
  const [over, setOver] = useState(false);
  const ref = useRef(null);

  async function handleFiles(fileList) {
    const files = [...(fileList || [])].filter(f => /^(image|video)\//.test(f.type));
    if (!files.length) { setError('Pick image or video files'); return; }
    setError('');
    const out = [];
    for (const [i, f] of files.entries()) {
      const video = f.type.startsWith('video/');
      setBusy(`Uploading ${i + 1} of ${files.length}${video ? ' (video — may take a minute)' : ''}…`);
      try {
        const a = video ? await uploadVideo(f) : await uploadImage(f);
        out.push({ type: video ? 'video' : 'image', url: a.url });
        if (!video) recordMedia(a, label);
      } catch (e) { setError(`${f.name}: ${e.message || 'upload failed'}`); }
    }
    setBusy('');
    if (out.length) onAdd(out);
  }

  function addLink() {
    const u = link.trim();
    if (!/^https?:\/\//.test(u)) { setError('Paste a full link starting with https://'); return; }
    onAdd([{ type: isVideoUrl(u) ? 'video' : 'image', url: u }]);
    setLink(''); setError('');
  }

  return (
    <div>
      <div
        onClick={() => !busy && ref.current?.click()}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); handleFiles(e.dataTransfer.files); }}
        className={`border-2 border-dashed rounded-xl px-4 py-6 text-center cursor-pointer transition ${over ? 'border-brand-primary bg-brand-primary/5' : 'border-slate-300 hover:border-brand-primary/60'}`}
      >
        <div className="text-2xl">🖼️ 🎬</div>
        <div className="text-sm text-slate-600 mt-1">{busy || 'Drag & drop photos and videos here, or click to choose (several at once)'}</div>
        <div className="text-[11px] text-slate-400 mt-0.5">JPG, PNG, WEBP · MP4, MOV, WEBM</div>
        <input ref={ref} type="file" multiple accept="image/*,video/*" className="hidden" onChange={e => { handleFiles(e.target.files); e.target.value = ''; }} />
      </div>
      <div className="flex gap-2 mt-2">
        <input value={link} onChange={e => setLink(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }}
          placeholder="…or paste an image / video / YouTube link" className="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-2" />
        <button type="button" onClick={addLink} className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold hover:bg-slate-50">Add link</button>
      </div>
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
}
