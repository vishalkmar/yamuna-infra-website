import React, { useEffect, useState, useCallback, useRef } from 'react';
import api, { apiError } from '../../lib/api';
import { uploadDocument } from '../../lib/uploads';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import SearchBar from '../../components/SearchBar';
import DataTable from '../../components/DataTable';
import FormModal, { Field, inputClass } from '../../components/FormModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { fmtDate } from '../../lib/format';

export default function BookingDockets() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [manage, setManage] = useState(null); // resident being managed

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/documents/residents', { params: search ? { search } : {} });
      setRows(data.data);
    } catch (e) { toast.error(apiError(e, 'Could not load residents')); } finally { setLoading(false); }
  }, [search, toast]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    { key: 'name', header: 'Resident', render: r => <span className="font-medium text-slate-800">{r.name || '—'}</span> },
    { key: 'email', header: 'Email', render: r => <span className="text-slate-600">{r.email || '—'}</span> },
    { key: 'mobile', header: 'Phone' },
    { key: 'docketCount', header: 'Dockets', render: r => `${r.docketCount || 0}` },
  ];

  return (
    <div>
      <PageHeader title="Booking Dockets" subtitle="Upload booking docket PDFs per resident — shown in their app" />
      <div className="mb-4"><SearchBar value={search} onChange={setSearch} placeholder="Search resident…" /></div>
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        empty="No residents found."
        actions={r => (
          <button onClick={() => setManage(r)} className="text-brand-primary font-semibold hover:underline">Manage</button>
        )}
      />
      <DocketManager resident={manage} onClose={() => setManage(null)} onChanged={load} />
    </div>
  );
}

function DocketManager({ resident, onClose, onChanged }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [pendingUrl, setPendingUrl] = useState('');
  const [saving, setSaving] = useState(false);
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

  useEffect(() => { if (resident) { setTitle(''); setPendingUrl(''); load(); } }, [resident, load]);

  async function pickFile(file) {
    if (!file) return;
    setUploading(true);
    try {
      // Only upload to Cloudinary here and stage the URL for preview. The docket
      // is created when the user clicks "Add docket" (save), so the submit button
      // never fires before a file is ready.
      const asset = await uploadDocument(file);
      setPendingUrl(asset.url);
      if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ''));
      toast.success('PDF uploaded ✓ — now click “Add docket” to save');
    } catch (e) {
      toast.error(apiError(e, 'Upload failed — check the file or paste a URL'));
    } finally { setUploading(false); }
  }

  async function save() {
    if (!pendingUrl) { toast.error('Upload a PDF first (or paste a URL)'); return; }
    if (!title.trim()) { toast.error('Enter a title'); return; }
    setSaving(true);
    try {
      const { data } = await api.post('/admin/documents', { userId: resident.id, title: title.trim(), url: pendingUrl, kind: 'booking_docket' });
      setDocs(data.data); setTitle(''); setPendingUrl('');
      toast.success('Docket added');
      onChanged && onChanged();
    } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); }
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
        onSubmit={save}
        submitting={saving}
        submitLabel="Add docket"
      >
        <div className="rounded-lg border border-slate-200 p-3">
          <span className="block text-sm font-bold text-slate-700 mb-2">Upload a booking docket (PDF)</span>
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={e => pickFile(e.target.files?.[0])} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50 disabled:opacity-50">
              {uploading ? 'Uploading…' : '📎 Choose PDF'}
            </button>
            {pendingUrl && <a href={pendingUrl} target="_blank" rel="noreferrer" className="text-xs text-emerald-700 underline">uploaded ✓ preview</a>}
          </div>
          <Field label="Title" required><input className={`${inputClass} mt-2`} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Booking Docket — Flat A-1203" /></Field>
          <div className="mt-1">
            <input className={inputClass} value={pendingUrl} onChange={e => setPendingUrl(e.target.value)} placeholder="…or paste a PDF URL" />
          </div>
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
