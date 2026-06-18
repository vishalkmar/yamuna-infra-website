import React, { useEffect, useState } from 'react';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import FormModal, { Field, inputClass } from '../../components/FormModal';
import { INDIA_STATES, PROPERTY_TYPES } from '../../lib/india';
import { computePreview, FREQ_LABEL, inr } from '../../lib/loan';

const PIN_RX = /^\d{6}$/;
const blank = {
  label: '', projectName: '', tower: '', flatNo: '', floor: '',
  areaSqft: '', propertyType: '', addressLine: '', city: '', state: '', pincode: '', notes: '',
  workStatus: 'expected', workTargetDate: '', workPercent: '', floorsTotal: '', floorsDone: '',
  planTotalAmount: '', planDownpayment: '', planMonthly: '', planGap: 1, planFirstDue: '', planStart: '',
  planLateEnabled: false, planLateGrace: '', planLateType: 'flat', planLateValue: '', planLateMode: 'separate',
};

// Add or edit a single property for a resident.
export default function PropertyFormModal({ open, userId, property, onClose, onSaved }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState(blank);
  const isEdit = !!property;

  useEffect(() => {
    if (!open) return;
    setF(property ? {
      ...blank, ...property,
      areaSqft: property.areaSqft ?? '',
      workStatus: property.workStatus || 'expected',
      workTargetDate: property.workTargetDate ? String(property.workTargetDate).slice(0, 10) : '',
      workPercent: property.workPercent ?? '',
      floorsTotal: property.floorsTotal ?? '',
      floorsDone: property.floorsDone ?? '',
    } : blank);
  }, [open, property]);

  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));

  async function submit() {
    if (f.pincode && !PIN_RX.test(f.pincode)) { toast.error('Pincode must be 6 digits'); return; }
    setBusy(true);
    try {
      const body = {
        ...f,
        areaSqft: f.areaSqft === '' ? null : Number(f.areaSqft),
        workPercent: f.workPercent === '' ? 0 : Number(f.workPercent),
        floorsTotal: f.floorsTotal === '' ? null : Number(f.floorsTotal),
        floorsDone: f.floorsDone === '' ? null : Number(f.floorsDone),
        workTargetDate: f.workTargetDate || null,
      };
      // On add, attach a payment plan if provided (generates the schedule).
      if (!isEdit && f.planTotalAmount && f.planMonthly) {
        body.plan = {
          totalAmount: Number(f.planTotalAmount) || 0,
          downpayment: Number(f.planDownpayment) || 0,
          monthlyAmount: Number(f.planMonthly) || 0,
          gapMonths: Number(f.planGap) || 1,
          firstDueDate: f.planFirstDue || null,
          startDate: f.planStart || null,
          lateFeeEnabled: !!f.planLateEnabled,
          lateFeeGraceDays: Number(f.planLateGrace) || 0,
          lateFeeType: f.planLateType || 'flat',
          lateFeeValue: Number(f.planLateValue) || 0,
          lateFeeMode: f.planLateMode || 'separate',
        };
      }
      if (isEdit) await api.put(`/admin/users/${userId}/properties/${property.id}`, body);
      else await api.post(`/admin/users/${userId}/properties`, body);
      toast.success(isEdit ? 'Property updated' : 'Property added');
      onSaved && onSaved();
      onClose();
    } catch (e) {
      toast.error(apiError(e, 'Could not save property'));
    } finally { setBusy(false); }
  }

  return (
    <FormModal open={open} title={isEdit ? 'Edit property' : 'Add property'} onClose={onClose} onSubmit={submit} submitting={busy} submitLabel={isEdit ? 'Save' : 'Add property'}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Label"><input className={inputClass} value={f.label} onChange={e => set('label', e.target.value)} placeholder="Home / Investment" /></Field>
        <Field label="Project name"><input className={inputClass} value={f.projectName} onChange={e => set('projectName', e.target.value)} /></Field>
        <Field label="Tower / Block"><input className={inputClass} value={f.tower} onChange={e => set('tower', e.target.value)} /></Field>
        <Field label="Flat no."><input className={inputClass} value={f.flatNo} onChange={e => set('flatNo', e.target.value)} placeholder="A-1203" /></Field>
        <Field label="Floor"><input className={inputClass} value={f.floor} onChange={e => set('floor', e.target.value)} /></Field>
        <Field label="Area (sq.ft)"><input className={inputClass} value={f.areaSqft} onChange={e => set('areaSqft', e.target.value.replace(/[^\d.]/g, ''))} placeholder="1250" /></Field>
        <Field label="Type">
          <select className={inputClass} value={f.propertyType} onChange={e => set('propertyType', e.target.value)}>
            <option value="">Select…</option>
            {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Pincode"><input className={inputClass} value={f.pincode} onChange={e => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} /></Field>
      </div>
      <Field label="Property address"><input className={inputClass} value={f.addressLine} onChange={e => set('addressLine', e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="City"><input className={inputClass} value={f.city} onChange={e => set('city', e.target.value)} /></Field>
        <Field label="State">
          <select className={inputClass} value={f.state || ''} onChange={e => set('state', e.target.value)}>
            <option value="">Select state…</option>
            {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Notes"><textarea rows={2} className={inputClass} value={f.notes || ''} onChange={e => set('notes', e.target.value)} /></Field>

      <div className="pt-2 border-t border-slate-100">
        <span className="block text-sm font-bold text-slate-700 mb-2">Construction progress</span>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <select className={inputClass} value={f.workStatus} onChange={e => set('workStatus', e.target.value)}>
              <option value="expected">Expected (in progress)</option>
              <option value="completed">Completed</option>
            </select>
          </Field>
          <Field label={f.workStatus === 'completed' ? 'Completed on' : 'Expected completion'}>
            <input type="date" className={inputClass} value={f.workTargetDate} onChange={e => set('workTargetDate', e.target.value)} />
          </Field>
          <Field label="Work %"><input className={inputClass} value={f.workPercent} onChange={e => set('workPercent', e.target.value.replace(/[^\d]/g, '').slice(0, 3))} placeholder="0-100" /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Floors total"><input className={inputClass} value={f.floorsTotal} onChange={e => set('floorsTotal', e.target.value.replace(/[^\d]/g, ''))} /></Field>
            <Field label="Floors done"><input className={inputClass} value={f.floorsDone} onChange={e => set('floorsDone', e.target.value.replace(/[^\d]/g, ''))} /></Field>
          </div>
        </div>
      </div>

      {!isEdit && (
        <div className="pt-2 border-t border-slate-100">
          <span className="block text-sm font-bold text-slate-700 mb-2">Payment plan (optional)</span>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Final amount"><input className={inputClass} value={f.planTotalAmount} onChange={e => set('planTotalAmount', e.target.value.replace(/[^\d.]/g, ''))} /></Field>
            <Field label="Down payment"><input className={inputClass} value={f.planDownpayment} onChange={e => set('planDownpayment', e.target.value.replace(/[^\d.]/g, ''))} /></Field>
            <Field label="Monthly amount (₹/month)"><input className={inputClass} value={f.planMonthly} onChange={e => set('planMonthly', e.target.value.replace(/[^\d.]/g, ''))} /></Field>
            <Field label="Pay frequency">
              <select className={inputClass} value={f.planGap} onChange={e => set('planGap', Number(e.target.value))}>
                {[1, 2, 3, 6].map(g => <option key={g} value={g}>{FREQ_LABEL[g]}</option>)}
              </select>
            </Field>
            <Field label="First due date"><input type="date" className={inputClass} value={f.planFirstDue} onChange={e => set('planFirstDue', e.target.value)} /></Field>
            <Field label="Start date"><input type="date" className={inputClass} value={f.planStart} onChange={e => set('planStart', e.target.value)} /></Field>
          </div>
          {f.planTotalAmount && f.planMonthly ? (() => {
            const c = computePreview({ totalAmount: f.planTotalAmount, downpayment: f.planDownpayment, monthlyAmount: f.planMonthly, gapMonths: f.planGap, firstDueDate: f.planFirstDue });
            return <div className="text-xs text-indigo-800 bg-indigo-50 border border-indigo-200 rounded-lg p-2 mt-1">Balance <b>{inr(c.balance)}</b> · <b>{c.count}</b> × <b>{inr(c.per)}</b> ({FREQ_LABEL[c.gap]}){c.endDate ? <> · ends <b>{c.endDate}</b></> : ''}</div>;
          })() : null}

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mt-2">
            <input type="checkbox" checked={f.planLateEnabled} onChange={e => set('planLateEnabled', e.target.checked)} />
            Apply overdue / late charge
          </label>
          {f.planLateEnabled && (
            <div className="grid grid-cols-4 gap-2 mt-1">
              <Field label="Grace days"><input className={inputClass} value={f.planLateGrace} onChange={e => set('planLateGrace', e.target.value.replace(/[^\d]/g, ''))} placeholder="2" /></Field>
              <Field label="Type"><select className={inputClass} value={f.planLateType} onChange={e => set('planLateType', e.target.value)}><option value="flat">Flat ₹</option><option value="percent">%</option></select></Field>
              <Field label="Value"><input className={inputClass} value={f.planLateValue} onChange={e => set('planLateValue', e.target.value.replace(/[^\d.]/g, ''))} placeholder="1000" /></Field>
              <Field label="Payable"><select className={inputClass} value={f.planLateMode} onChange={e => set('planLateMode', e.target.value)}><option value="separate">At end</option><option value="final">Now</option></select></Field>
            </div>
          )}
          <p className="text-xs text-slate-400 mt-1">Or skip and set it up later from the Payments & Plan tab.</p>
        </div>
      )}
    </FormModal>
  );
}
