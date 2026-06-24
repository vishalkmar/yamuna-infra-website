import React, { useEffect, useState } from 'react';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import FormModal, { Field, inputClass } from '../../components/FormModal';
import ImageUploader from '../../components/ImageUploader';

const TYPES = [
  { value: 'channel_partner', label: 'Channel Partner' },
  { value: 'broker', label: 'Broker' },
  { value: 'in_house', label: 'In-house' },
  { value: 'freelancer', label: 'Freelancer' },
];

const empty = {
  name: '', email: '', phone: '', password: '', agentType: 'channel_partner',
  tierId: '', companyName: '', city: '', state: '', pan: '', gst: '',
  photoUrl: '', status: 'active', kycStatus: 'none',
};

// mode: 'create' | 'edit'. On edit, password is managed separately (reset).
export default function AgentFormModal({ open, mode = 'create', initial, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(empty);
  const [tiers, setTiers] = useState([]);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!open) return;
    api.get('/admin/agents/tiers').then(r => setTiers(r.data.data)).catch(() => {});
    if (mode === 'edit' && initial) {
      setForm({
        ...empty,
        ...initial,
        tierId: initial.tierId || '',
      });
    } else {
      setForm(empty);
    }
  }, [open, mode, initial]);

  async function submit() {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (mode === 'create') {
      if (!form.email.trim()) { toast.error('Email is required'); return; }
      if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    }
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        phone: form.phone || null,
        agentType: form.agentType,
        tierId: form.tierId ? Number(form.tierId) : null,
        companyName: form.companyName || null,
        city: form.city || null,
        state: form.state || null,
        pan: form.pan || null,
        gst: form.gst || null,
        photoUrl: form.photoUrl || null,
      };
      if (mode === 'create') {
        await api.post('/admin/agents', {
          ...payload,
          email: form.email,
          password: form.password,
          status: form.status,
          kycStatus: form.kycStatus,
        });
        toast.success('Agent created');
      } else {
        await api.put(`/admin/agents/${initial.id}`, { ...payload, adminNotes: form.adminNotes || null });
        toast.success('Agent updated');
      }
      onSaved && onSaved();
    } catch (e) {
      toast.error(apiError(e, 'Could not save agent'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormModal
      open={open}
      title={mode === 'create' ? 'Add agent' : 'Edit agent'}
      onClose={onClose}
      onSubmit={submit}
      submitting={busy}
      submitLabel={mode === 'create' ? 'Create agent' : 'Save changes'}
      wide
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Full name" required><input className={inputClass} value={form.name} onChange={e => set('name', e.target.value)} /></Field>
        <Field label="Phone"><input className={inputClass} value={form.phone || ''} onChange={e => set('phone', e.target.value)} /></Field>

        {mode === 'create' ? (
          <>
            <Field label="Email" required><input type="email" className={inputClass} value={form.email} onChange={e => set('email', e.target.value)} /></Field>
            <Field label="Password" hint="Min 8 characters" required><input type="password" className={inputClass} value={form.password} onChange={e => set('password', e.target.value)} /></Field>
          </>
        ) : (
          <Field label="Email"><input className={inputClass} value={form.email} disabled /></Field>
        )}

        <Field label="Type"><select className={inputClass} value={form.agentType} onChange={e => set('agentType', e.target.value)}>{TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
        <Field label="Tier"><select className={inputClass} value={form.tierId} onChange={e => set('tierId', e.target.value)}><option value="">— None —</option>{tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>

        <Field label="Company"><input className={inputClass} value={form.companyName || ''} onChange={e => set('companyName', e.target.value)} /></Field>
        <Field label="City"><input className={inputClass} value={form.city || ''} onChange={e => set('city', e.target.value)} /></Field>
        <Field label="State"><input className={inputClass} value={form.state || ''} onChange={e => set('state', e.target.value)} /></Field>
        <Field label="PAN"><input className={inputClass} value={form.pan || ''} onChange={e => set('pan', e.target.value)} /></Field>
        <Field label="GST"><input className={inputClass} value={form.gst || ''} onChange={e => set('gst', e.target.value)} /></Field>

        {mode === 'create' && (
          <>
            <Field label="Status"><select className={inputClass} value={form.status} onChange={e => set('status', e.target.value)}><option value="active">Active</option><option value="pending">Pending</option></select></Field>
            <Field label="KYC status"><select className={inputClass} value={form.kycStatus} onChange={e => set('kycStatus', e.target.value)}><option value="none">None</option><option value="pending">Pending</option><option value="approved">Approved</option></select></Field>
          </>
        )}
      </div>

      <Field label="Photo">
        <ImageUploader value={form.photoUrl} onChange={url => set('photoUrl', url)} label="Agent photo" />
      </Field>
    </FormModal>
  );
}
