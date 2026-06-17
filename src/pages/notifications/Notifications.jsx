import React, { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import Pagination from '../../components/Pagination';
import FormModal, { Field, inputClass } from '../../components/FormModal';
import { fmtDateTime } from '../../lib/format';

const TARGETS = [
  { key: 'all', label: 'Everyone' },
  { key: 'kyc', label: 'By KYC status' },
  { key: 'tower', label: 'By tower' },
  { key: 'user', label: 'Single resident (user ID)' },
];
const KYC_VALUES = ['none', 'pending', 'approved', 'rejected'];

const blank = { title: '', body: '', category: '', icon: '🔔', link: '', targetType: 'all', targetValue: '' };

export default function Notifications() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data: res } = await api.get('/admin/notifications', { params: { page, pageSize: 20 } }); setData(res.data); }
    catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [page, toast]);

  useEffect(() => { load(); }, [load]);
  const setF = (k, v) => setModal(m => ({ ...m, [k]: v }));

  async function send() {
    setBusy(true);
    try {
      const payload = { ...modal };
      const { data: res } = await api.post('/admin/notifications', payload);
      toast.success(res.message || 'Sent');
      setModal(null); setPage(1); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const columns = [
    { key: 'title', header: 'Notification', render: r => (
      <div><div className="font-medium text-slate-800">{r.icon} {r.title}</div><div className="text-xs text-slate-400 line-clamp-1">{r.body}</div></div>
    ) },
    { key: 'targetType', header: 'Target', render: r => (
      <span className="capitalize">{r.targetType}{r.targetValue ? ` · ${r.targetValue}` : ''}</span>
    ) },
    { key: 'totalCount', header: 'Sent', render: r => `${r.totalCount}` },
    { key: 'readCount', header: 'Read', render: r => (
      <span className="text-slate-600">{r.readCount}/{r.totalCount}{r.totalCount ? ` · ${Math.round((r.readCount / r.totalCount) * 100)}%` : ''}</span>
    ) },
    { key: 'createdAt', header: 'Sent at', render: r => fmtDateTime(r.createdAt) },
  ];

  return (
    <div>
      <PageHeader title="Notifications & Broadcast" subtitle="Compose and send to residents' in-app feed" actionLabel="+ Send notification" onAction={() => setModal({ ...blank })} />

      <DataTable columns={columns} rows={data.rows} loading={loading} empty="No notifications sent yet" />
      <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />

      {modal && (
        <FormModal open title="Send notification" onClose={() => setModal(null)} onSubmit={send} submitting={busy} submitLabel="Send now">
          <Field label="Title" required><input className={inputClass} value={modal.title} onChange={e => setF('title', e.target.value)} /></Field>
          <Field label="Body" required><textarea rows={3} className={inputClass} value={modal.body} onChange={e => setF('body', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Icon (emoji)"><input className={inputClass} value={modal.icon} onChange={e => setF('icon', e.target.value)} /></Field>
            <Field label="Category"><input className={inputClass} value={modal.category} onChange={e => setF('category', e.target.value)} placeholder="maintenance / payment" /></Field>
          </div>
          <Field label="Deep link (optional)" hint="App route to open on tap"><input className={inputClass} value={modal.link} onChange={e => setF('link', e.target.value)} placeholder="/payments" /></Field>
          <Field label="Send to" required>
            <select className={inputClass} value={modal.targetType} onChange={e => setF('targetType', e.target.value)}>
              {TARGETS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </Field>
          {modal.targetType === 'kyc' && (
            <Field label="KYC status">
              <select className={inputClass} value={modal.targetValue} onChange={e => setF('targetValue', e.target.value)}>
                <option value="">Select…</option>
                {KYC_VALUES.map(v => <option key={v} value={v} className="capitalize">{v}</option>)}
              </select>
            </Field>
          )}
          {modal.targetType === 'tower' && (
            <Field label="Tower"><input className={inputClass} value={modal.targetValue} onChange={e => setF('targetValue', e.target.value)} placeholder="e.g. Tower 2" /></Field>
          )}
          {modal.targetType === 'user' && (
            <Field label="Resident user ID"><input type="number" className={inputClass} value={modal.targetValue} onChange={e => setF('targetValue', e.target.value)} /></Field>
          )}
        </FormModal>
      )}
    </div>
  );
}
