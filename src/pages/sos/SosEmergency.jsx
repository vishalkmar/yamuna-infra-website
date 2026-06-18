import React, { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import FormModal, { Field, inputClass } from '../../components/FormModal';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function SosEmergency() {
  const toast = useToast();
  const [sosPhone, setSosPhone] = useState('');
  const [savedPhone, setSavedPhone] = useState('');
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingPhone, setSavingPhone] = useState(false);
  const [modal, setModal] = useState(null); // { service? } | null
  const [confirmDel, setConfirmDel] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/sos/config');
      setSosPhone(data.data.sosPhone || '');
      setSavedPhone(data.data.sosPhone || '');
      setServices(data.data.services || []);
    } catch (e) { toast.error(apiError(e, 'Could not load SOS settings')); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function savePhone() {
    setSavingPhone(true);
    try {
      await api.put('/admin/sos/config', { sosPhone });
      setSavedPhone(sosPhone);
      toast.success('SOS number saved');
    } catch (e) { toast.error(apiError(e)); } finally { setSavingPhone(false); }
  }

  async function delService() {
    setBusy(true);
    try {
      const { data } = await api.delete(`/admin/sos/services/${confirmDel.id}`);
      setServices(data.data);
      setConfirmDel(null);
      toast.success('Service removed');
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  if (loading) return <div className="text-slate-400">Loading…</div>;

  return (
    <div>
      <PageHeader title="SOS & Emergency" subtitle="Dispatch number + emergency services shown to every resident" />

      {/* SOS dispatch number */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5 max-w-xl">
        <h3 className="font-bold text-slate-800 mb-1">🆘 SOS dispatch number</h3>
        <p className="text-sm text-slate-500 mb-3">The single emergency control-room / reception number residents reach on SOS.</p>
        <div className="flex gap-2">
          <input className={inputClass} value={sosPhone} onChange={e => setSosPhone(e.target.value)} placeholder="+91 9000000000" />
          <button onClick={savePhone} disabled={savingPhone || sosPhone === savedPhone}
            className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 shrink-0">
            {savingPhone ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Emergency services list */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-slate-800">Emergency services <span className="text-slate-400 font-normal">({services.length})</span></h3>
        <button onClick={() => setModal({})} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-brand-primary hover:opacity-90">+ Add service</button>
      </div>
      {services.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400">No emergency services yet (e.g. Ambulance, Security, Fire).</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {services.map(s => (
            <div key={s.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="font-medium text-slate-800">{s.name}</div>
                <div className="text-sm text-slate-500">{s.phone}</div>
              </div>
              <div className="flex gap-3 text-sm">
                <button onClick={() => setModal({ service: s })} className="text-brand-primary font-semibold hover:underline">Edit</button>
                <button onClick={() => setConfirmDel(s)} className="text-rose-600 font-semibold hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ServiceModal open={!!modal} service={modal?.service} onClose={() => setModal(null)} onSaved={setServices} />
      <ConfirmDialog
        open={!!confirmDel}
        title="Delete service?"
        message={`Remove ${confirmDel?.name || 'this service'} from the emergency list?`}
        confirmLabel="Delete" danger busy={busy}
        onCancel={() => setConfirmDel(null)} onConfirm={delService}
      />
    </div>
  );
}

function ServiceModal({ open, service, onClose, onSaved }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const isEdit = !!service;
  const [f, setF] = useState({ name: '', phone: '' });

  useEffect(() => { if (open) setF({ name: service?.name || '', phone: service?.phone || '' }); }, [open, service]);

  async function submit() {
    if (!f.name.trim() || !f.phone.trim()) { toast.error('Name and phone are required'); return; }
    setBusy(true);
    try {
      const body = { name: f.name.trim(), phone: f.phone.trim() };
      const { data } = isEdit
        ? await api.put(`/admin/sos/services/${service.id}`, body)
        : await api.post('/admin/sos/services', body);
      onSaved(data.data);
      toast.success(isEdit ? 'Service updated' : 'Service added');
      onClose();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  return (
    <FormModal open={open} title={isEdit ? 'Edit service' : 'Add emergency service'} onClose={onClose} onSubmit={submit} submitting={busy} submitLabel={isEdit ? 'Save' : 'Add'}>
      <Field label="Service name" required><input className={inputClass} value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} placeholder="Ambulance / Security / Fire" /></Field>
      <Field label="Phone" required><input className={inputClass} value={f.phone} onChange={e => setF(p => ({ ...p, phone: e.target.value }))} placeholder="108" /></Field>
    </FormModal>
  );
}
