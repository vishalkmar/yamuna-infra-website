import React, { useEffect, useState, useCallback } from 'react';
import { listMedia, deleteMedia } from '../../lib/media';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import SearchBar from '../../components/SearchBar';
import Pagination from '../../components/Pagination';
import ConfirmDialog from '../../components/ConfirmDialog';
import ImageUploader from '../../components/ImageUploader';
import { fmtDate } from '../../lib/format';

function kb(bytes) {
  if (!bytes) return '';
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export default function Media() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0, pageSize: 24 });
  const [loading, setLoading] = useState(true);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [dummy, setDummy] = useState(''); // ImageUploader value; upload auto-records

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, pageSize: 24 };
      if (search) params.search = search;
      setData(await listMedia(params));
    } catch { toast.error('Could not load media'); } finally { setLoading(false); }
  }, [page, search, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  async function remove() {
    setBusy(true);
    try { await deleteMedia(del.id); toast.success('Removed from library'); setDel(null); load(); }
    catch { toast.error('Delete failed'); } finally { setBusy(false); }
  }

  function copy(url) {
    navigator.clipboard?.writeText(url);
    toast.success('URL copied');
  }

  return (
    <div>
      <PageHeader title="Media Library" subtitle={`${data.total} image${data.total === 1 ? '' : 's'}`} actionLabel={uploadOpen ? 'Close uploader' : '+ Upload'} onAction={() => setUploadOpen(o => !o)} />

      {uploadOpen && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 max-w-md">
          <ImageUploader label="Upload to library" value={dummy} onChange={v => { setDummy(''); if (v) { toast.success('Uploaded'); load(); } }} />
          <p className="text-xs text-slate-400 mt-2">Uploaded images are saved here automatically and reusable across all modules.</p>
        </div>
      )}

      <div className="mb-4"><SearchBar value={search} onChange={setSearch} placeholder="Search by label / id…" /></div>

      {loading ? (
        <div className="text-slate-400">Loading…</div>
      ) : data.rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">No images yet. Click “Upload”.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {data.rows.map(a => (
            <div key={a.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden group">
              <div className="aspect-square bg-slate-100">
                <img src={a.url} alt={a.label || ''} className="w-full h-full object-cover" />
              </div>
              <div className="p-2">
                <div className="text-xs text-slate-500 truncate">{a.label || a.publicId || 'image'}</div>
                <div className="text-[10px] text-slate-400">{a.width && a.height ? `${a.width}×${a.height} · ` : ''}{kb(a.bytes)} · {fmtDate(a.createdAt)}</div>
                <div className="flex gap-2 mt-1">
                  <button onClick={() => copy(a.url)} className="text-[11px] text-brand-primary hover:underline">Copy URL</button>
                  <button onClick={() => setDel(a)} className="text-[11px] text-rose-600 hover:underline">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />

      <ConfirmDialog open={!!del} title="Remove from library?" message="The Cloudinary image itself stays; only the library record is removed." confirmLabel="Remove" danger busy={busy} onCancel={() => setDel(null)} onConfirm={remove} />
    </div>
  );
}
