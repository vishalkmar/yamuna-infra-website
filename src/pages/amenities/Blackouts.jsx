import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormModal, { Field, inputClass } from '../../components/FormModal';
import { fmtDate } from '../../lib/format';

export default function Blackouts() {
  const { amenityId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [facility, setFacility] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/amenities/${amenityId}/blackouts`);
      setFacility(data.data.facility); setRows(data.data.blackouts);
    } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [amenityId, toast]);

  useEffect(() => { load(); }, [load]);
  const setF = (k, v) => setModal(m => ({ ...m, form: { ...m.form, [k]: v } }));

  async function save() {
    setBusy(true);
    try {
      await api.post(`/admin/amenities/${amenityId}/blackouts`, modal.form);
      toast.success('Blackout added'); setModal(null); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    try { await api.delete(`/admin/amenities/blackouts/${del.id}`); toast.success('Blackout removed'); setDel(null); load(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const columns = [
    { key: 'blackoutDate', header: 'Date', render: r => <span className="font-medium text-slate-800">{fmtDate(r.blackoutDate)}</span> },
    { key: 'reason', header: 'Reason', render: r => r.reason || '—' },
  ];

  return (
    <div>
      <button onClick={() => navigate('/amenities')} className="text-sm text-slate-500 hover:text-slate-700 mb-3">← Back to amenities</button>
      <PageHeader title={`${facility?.name || 'Facility'} — Blackout dates`} subtitle={`${rows.length} date${rows.length === 1 ? '' : 's'} unavailable`} actionLabel="+ Add blackout" onAction={() => setModal({ form: { blackoutDate: '', reason: '' } })} />

      <DataTable columns={columns} rows={rows} loading={loading} empty="No blackout dates — facility is bookable every day"
        actions={r => (
          <button onClick={() => setDel(r)} className="text-rose-600 hover:underline">Remove</button>
        )}
      />

      {modal && (
        <FormModal open title="Add blackout date" onClose={() => setModal(null)} onSubmit={save} submitting={busy} submitLabel="Add">
          <Field label="Date" required><input type="date" className={inputClass} value={modal.form.blackoutDate} onChange={e => setF('blackoutDate', e.target.value)} /></Field>
          <Field label="Reason"><input className={inputClass} value={modal.form.reason} onChange={e => setF('reason', e.target.value)} placeholder="Maintenance / Private event" /></Field>
        </FormModal>
      )}

      <ConfirmDialog open={!!del} title="Remove blackout?" message={del ? `${fmtDate(del.blackoutDate)} will become bookable again.` : ''} confirmLabel="Remove" danger busy={busy} onCancel={() => setDel(null)} onConfirm={remove} />
    </div>
  );
}
