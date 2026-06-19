import React, { useEffect, useState, useCallback, useRef } from 'react';
import api, { apiError } from '../../lib/api';
import { uploadDocketPdf } from '../../lib/uploads';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import SearchBar from '../../components/SearchBar';
import DataTable from '../../components/DataTable';
import FormModal from '../../components/FormModal';
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
