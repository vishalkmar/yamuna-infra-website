import React, { useEffect, useState } from 'react';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import FormModal, { Field, inputClass } from '../../components/FormModal';
import ImageUploader from '../../components/ImageUploader';
import { INDIA_STATES, PROPERTY_TYPES } from '../../lib/india';
import { computePreview, FREQ_LABEL, inr } from '../../lib/loan';

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RX = /^[6-9]\d{9}$/;
const PIN_RX = /^\d{6}$/;

const emptyProperty = () => ({
  label: '', projectName: '', tower: '', flatNo: '', floor: '',
  areaSqft: '', propertyType: '', addressLine: '', city: '', state: '', pincode: '',
  workStatus: 'expected', workTargetDate: '', workPercent: '', floorsTotal: '', floorsDone: '',
  planTotalAmount: '', planDownpayment: '', planMonthly: '', planGap: 1, planFirstDue: '', planStart: '',
  planLateEnabled: false, planLateGrace: '', planLateType: 'flat', planLateValue: '', planLateMode: 'separate',
});

function StateSelect({ value, onChange }) {
  return (
    <select className={inputClass} value={value || ''} onChange={e => onChange(e.target.value)}>
      <option value="">Select state…</option>
      {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}

// Create or edit a resident. On CREATE you can also add one+ properties inline.
// On EDIT, only core fields + self-address are shown (properties are managed on
// the resident's detail page).
export default function ResidentFormModal({ open, mode = 'create', initial = null, onClose, onSaved }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    name: '', email: '', mobile: '', profilePhoto: '',
    addressLine: '', city: '', state: '', pincode: '',
  });
  const [properties, setProperties] = useState([emptyProperty()]);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initial) {
      setF({
        name: initial.name || '', email: initial.email || '', mobile: initial.mobile || '',
        profilePhoto: initial.profilePhoto || '', addressLine: initial.addressLine || '',
        city: initial.city || '', state: initial.state || '', pincode: initial.pincode || '',
      });
    } else {
      setF({ name: '', email: '', mobile: '', profilePhoto: '', addressLine: '', city: '', state: '', pincode: '' });
      setProperties([emptyProperty()]);
    }
  }, [open, mode, initial]);

  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));
  const setProp = (i, k, v) => setProperties(prev => prev.map((p, idx) => (idx === i ? { ...p, [k]: v } : p)));
  const addProp = () => setProperties(prev => [...prev, emptyProperty()]);
  const removeProp = i => setProperties(prev => prev.filter((_, idx) => idx !== i));

  function validate() {
    if (!f.name.trim() || f.name.trim().length < 2) return 'Enter the resident name';
    if (!EMAIL_RX.test(f.email.trim())) return 'Enter a valid email (used for app login)';
    if (!PHONE_RX.test(f.mobile.trim())) return 'Enter a valid 10-digit phone (starts 6-9)';
    if (f.pincode && !PIN_RX.test(f.pincode)) return 'Self-address pincode must be 6 digits';
    for (const p of properties) {
      if (p.pincode && !PIN_RX.test(p.pincode)) return 'Property pincode must be 6 digits';
    }
    return null;
  }

  // Keep only properties the admin actually filled in (ignore default-only rows).
  const MEANINGFUL = ['label', 'projectName', 'tower', 'flatNo', 'floor', 'areaSqft', 'propertyType', 'addressLine', 'city', 'state', 'pincode', 'planTotalAmount', 'planMonthly'];
  function cleanProperties() {
    return properties
      .filter(p => MEANINGFUL.some(k => String(p[k] ?? '').trim() !== ''))
      .map(p => {
        const plan = p.planTotalAmount && p.planMonthly
          ? {
            totalAmount: Number(p.planTotalAmount) || 0,
            downpayment: Number(p.planDownpayment) || 0,
            monthlyAmount: Number(p.planMonthly) || 0,
            gapMonths: Number(p.planGap) || 1,
            firstDueDate: p.planFirstDue || null,
            startDate: p.planStart || null,
            lateFeeEnabled: !!p.planLateEnabled,
            lateFeeGraceDays: Number(p.planLateGrace) || 0,
            lateFeeType: p.planLateType || 'flat',
            lateFeeValue: Number(p.planLateValue) || 0,
            lateFeeMode: p.planLateMode || 'separate',
          }
          : undefined;
        return {
          ...p,
          areaSqft: p.areaSqft === '' ? null : Number(p.areaSqft),
          workPercent: p.workPercent === '' ? 0 : Number(p.workPercent),
          floorsTotal: p.floorsTotal === '' ? null : Number(p.floorsTotal),
          floorsDone: p.floorsDone === '' ? null : Number(p.floorsDone),
          workTargetDate: p.workTargetDate || null,
          plan,
        };
      });
  }

  async function submit() {
    const err = validate();
    if (err) { toast.error(err); return; }
    setBusy(true);
    try {
      const base = {
        name: f.name.trim(), email: f.email.trim().toLowerCase(), mobile: f.mobile.trim(),
        profilePhoto: f.profilePhoto || '', addressLine: f.addressLine || '', city: f.city || '',
        state: f.state || '', pincode: f.pincode || '',
      };
      if (mode === 'edit') {
        await api.put(`/admin/users/${initial.id}`, base);
        toast.success('Resident updated');
      } else {
        await api.post('/admin/users', { ...base, properties: cleanProperties() });
        toast.success('Resident created');
      }
      onSaved && onSaved();
      onClose();
    } catch (e) {
      toast.error(apiError(e, 'Could not save resident'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormModal
      open={open}
      wide
      title={mode === 'edit' ? 'Edit resident' : 'Add resident'}
      onClose={onClose}
      onSubmit={submit}
      submitting={busy}
      submitLabel={mode === 'edit' ? 'Save changes' : 'Create resident'}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Full name" required>
          <input className={inputClass} value={f.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Ramesh Kumar" />
        </Field>
        <Field label="Phone (10-digit)" required>
          <input className={inputClass} value={f.mobile} onChange={e => set('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="9876543210" />
        </Field>
      </div>
      <Field label="Email" hint="Resident logs into the app with this email" required>
        <input className={inputClass} value={f.email} onChange={e => set('email', e.target.value)} placeholder="resident@example.com" />
      </Field>

      <ImageUploader value={f.profilePhoto} onChange={v => set('profilePhoto', v)} label="Profile photo" />

      <div className="pt-2 border-t border-slate-100">
        <h4 className="text-sm font-bold text-slate-700 mb-2">Self address</h4>
        <Field label="Address line">
          <input className={inputClass} value={f.addressLine} onChange={e => set('addressLine', e.target.value)} placeholder="House / street / area" />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="City"><input className={inputClass} value={f.city} onChange={e => set('city', e.target.value)} /></Field>
          <Field label="State"><StateSelect value={f.state} onChange={v => set('state', v)} /></Field>
          <Field label="Pincode"><input className={inputClass} value={f.pincode} onChange={e => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="281121" /></Field>
        </div>
      </div>

      {mode === 'create' && (
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-slate-700">Property details</h4>
            <button type="button" onClick={addProp} className="text-sm font-semibold text-brand-primary hover:underline">+ Add property</button>
          </div>
          {properties.map((p, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-3 mb-3 bg-slate-50/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">Property {i + 1}</span>
                {properties.length > 1 && (
                  <button type="button" onClick={() => removeProp(i)} className="text-xs text-rose-600 hover:underline">Remove</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Label"><input className={inputClass} value={p.label} onChange={e => setProp(i, 'label', e.target.value)} placeholder="Home / Investment" /></Field>
                <Field label="Project name"><input className={inputClass} value={p.projectName} onChange={e => setProp(i, 'projectName', e.target.value)} /></Field>
                <Field label="Tower / Block"><input className={inputClass} value={p.tower} onChange={e => setProp(i, 'tower', e.target.value)} /></Field>
                <Field label="Flat no."><input className={inputClass} value={p.flatNo} onChange={e => setProp(i, 'flatNo', e.target.value)} placeholder="A-1203" /></Field>
                <Field label="Floor"><input className={inputClass} value={p.floor} onChange={e => setProp(i, 'floor', e.target.value)} /></Field>
                <Field label="Area (sq.ft)"><input className={inputClass} value={p.areaSqft} onChange={e => setProp(i, 'areaSqft', e.target.value.replace(/[^\d.]/g, ''))} placeholder="1250" /></Field>
                <Field label="Type">
                  <select className={inputClass} value={p.propertyType} onChange={e => setProp(i, 'propertyType', e.target.value)}>
                    <option value="">Select…</option>
                    {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Pincode"><input className={inputClass} value={p.pincode} onChange={e => setProp(i, 'pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} /></Field>
              </div>
              <Field label="Property address"><input className={inputClass} value={p.addressLine} onChange={e => setProp(i, 'addressLine', e.target.value)} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="City"><input className={inputClass} value={p.city} onChange={e => setProp(i, 'city', e.target.value)} /></Field>
                <Field label="State"><StateSelect value={p.state} onChange={v => setProp(i, 'state', v)} /></Field>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-200">
                <span className="block text-xs font-bold text-slate-500 mb-2">Construction progress</span>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Status">
                    <select className={inputClass} value={p.workStatus} onChange={e => setProp(i, 'workStatus', e.target.value)}>
                      <option value="expected">Expected (in progress)</option>
                      <option value="completed">Completed</option>
                    </select>
                  </Field>
                  <Field label={p.workStatus === 'completed' ? 'Completed on' : 'Expected completion'}>
                    <input type="date" className={inputClass} value={p.workTargetDate} onChange={e => setProp(i, 'workTargetDate', e.target.value)} />
                  </Field>
                  <Field label="Work %"><input className={inputClass} value={p.workPercent} onChange={e => setProp(i, 'workPercent', e.target.value.replace(/[^\d]/g, '').slice(0, 3))} placeholder="0-100" /></Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Floors total"><input className={inputClass} value={p.floorsTotal} onChange={e => setProp(i, 'floorsTotal', e.target.value.replace(/[^\d]/g, ''))} /></Field>
                    <Field label="Floors done"><input className={inputClass} value={p.floorsDone} onChange={e => setProp(i, 'floorsDone', e.target.value.replace(/[^\d]/g, ''))} /></Field>
                  </div>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-200">
                <span className="block text-xs font-bold text-slate-500 mb-2">Payment plan (optional — generates installment schedule)</span>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Final amount"><input className={inputClass} value={p.planTotalAmount} onChange={e => setProp(i, 'planTotalAmount', e.target.value.replace(/[^\d.]/g, ''))} placeholder="12500000" /></Field>
                  <Field label="Down payment"><input className={inputClass} value={p.planDownpayment} onChange={e => setProp(i, 'planDownpayment', e.target.value.replace(/[^\d.]/g, ''))} placeholder="2500000" /></Field>
                  <Field label="Monthly amount (₹/month)"><input className={inputClass} value={p.planMonthly} onChange={e => setProp(i, 'planMonthly', e.target.value.replace(/[^\d.]/g, ''))} placeholder="50000" /></Field>
                  <Field label="Pay frequency">
                    <select className={inputClass} value={p.planGap} onChange={e => setProp(i, 'planGap', Number(e.target.value))}>
                      {[1, 2, 3, 6].map(g => <option key={g} value={g}>{FREQ_LABEL[g]}</option>)}
                    </select>
                  </Field>
                  <Field label="First due date"><input type="date" className={inputClass} value={p.planFirstDue} onChange={e => setProp(i, 'planFirstDue', e.target.value)} /></Field>
                  <Field label="Agreement / start date"><input type="date" className={inputClass} value={p.planStart} onChange={e => setProp(i, 'planStart', e.target.value)} /></Field>
                </div>
                {p.planTotalAmount && p.planMonthly ? (() => {
                  const c = computePreview({ totalAmount: p.planTotalAmount, downpayment: p.planDownpayment, monthlyAmount: p.planMonthly, gapMonths: p.planGap, firstDueDate: p.planFirstDue });
                  return (
                    <div className="text-xs text-indigo-800 bg-indigo-50 border border-indigo-200 rounded-lg p-2 mt-1">
                      Balance <b>{inr(c.balance)}</b> · <b>{c.count}</b> installments of <b>{inr(c.per)}</b> ({FREQ_LABEL[c.gap]}){c.endDate ? <> · ends <b>{c.endDate}</b></> : ''}
                    </div>
                  );
                })() : null}

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mt-2">
                  <input type="checkbox" checked={p.planLateEnabled} onChange={e => setProp(i, 'planLateEnabled', e.target.checked)} />
                  Apply overdue / late charge
                </label>
                {p.planLateEnabled && (
                  <div className="grid grid-cols-4 gap-2 mt-1">
                    <Field label="Grace days"><input className={inputClass} value={p.planLateGrace} onChange={e => setProp(i, 'planLateGrace', e.target.value.replace(/[^\d]/g, ''))} placeholder="2" /></Field>
                    <Field label="Type">
                      <select className={inputClass} value={p.planLateType} onChange={e => setProp(i, 'planLateType', e.target.value)}>
                        <option value="flat">Flat ₹</option><option value="percent">%</option>
                      </select>
                    </Field>
                    <Field label="Value"><input className={inputClass} value={p.planLateValue} onChange={e => setProp(i, 'planLateValue', e.target.value.replace(/[^\d.]/g, ''))} placeholder="1000" /></Field>
                    <Field label="Payable">
                      <select className={inputClass} value={p.planLateMode} onChange={e => setProp(i, 'planLateMode', e.target.value)}>
                        <option value="separate">At end</option><option value="final">Now</option>
                      </select>
                    </Field>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </FormModal>
  );
}
