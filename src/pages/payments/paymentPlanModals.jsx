import React, { useEffect, useState } from 'react';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import FormModal, { Field, inputClass } from '../../components/FormModal';
import { computePreview, FREQ_LABEL, inr } from '../../lib/loan';

const dateVal = d => (d ? String(d).slice(0, 10) : '');
const PAY_METHODS = ['Cash', 'UPI', 'NetBanking', 'Cheque', 'Card', 'Bank Transfer'];

export const STATUS_CLS = {
  paid: 'bg-emerald-100 text-emerald-700',
  due: 'bg-amber-100 text-amber-700',
  overdue: 'bg-rose-100 text-rose-700',
  upcoming: 'bg-slate-100 text-slate-600',
};

// Edit plan + (re)generate schedule.
export function PlanModal({ open, propertyId, plan, onClose, onSaved }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ totalAmount: '', downpayment: '', monthlyAmount: '', gapMonths: 1, firstDueDate: '', startDate: '', notes: '', lateFeeEnabled: false, lateFeeGraceDays: '', lateFeeType: 'flat', lateFeeValue: '', lateFeeMode: 'separate' });

  useEffect(() => {
    if (!open) return;
    setF({
      totalAmount: plan?.totalAmount ?? '', downpayment: plan?.downpayment ?? '',
      monthlyAmount: plan?.monthlyAmount ?? '', gapMonths: plan?.gapMonths || 1,
      firstDueDate: dateVal(plan?.firstDueDate), startDate: dateVal(plan?.startDate), notes: plan?.notes || '',
      lateFeeEnabled: !!plan?.lateFeeEnabled, lateFeeGraceDays: plan?.lateFeeGraceDays ?? '',
      lateFeeType: plan?.lateFeeType || 'flat', lateFeeValue: plan?.lateFeeValue ?? '', lateFeeMode: plan?.lateFeeMode || 'separate',
    });
  }, [open, plan]);

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const calc = computePreview(f);

  async function submit() {
    if (!f.totalAmount || !f.monthlyAmount || !f.firstDueDate) {
      toast.error('Final amount, monthly amount and first due date are required'); return;
    }
    setBusy(true);
    try {
      await api.post(`/admin/payment-plan/property/${propertyId}/generate`, {
        totalAmount: Number(f.totalAmount), downpayment: Number(f.downpayment) || 0,
        monthlyAmount: Number(f.monthlyAmount), gapMonths: Number(f.gapMonths),
        firstDueDate: f.firstDueDate || null, startDate: f.startDate || null, notes: f.notes || null,
        lateFeeEnabled: f.lateFeeEnabled,
        lateFeeGraceDays: Number(f.lateFeeGraceDays) || 0,
        lateFeeType: f.lateFeeType, lateFeeValue: Number(f.lateFeeValue) || 0, lateFeeMode: f.lateFeeMode,
      });
      toast.success('Plan saved & schedule generated');
      onSaved && onSaved();
      onClose();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  return (
    <FormModal open={open} title="Payment plan" onClose={onClose} onSubmit={submit} submitting={busy} submitLabel="Save & generate schedule">
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
        Saving regenerates the schedule (existing payment marks on this property will be reset).
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Final property amount" required><input className={inputClass} value={f.totalAmount} onChange={e => set('totalAmount', e.target.value.replace(/[^\d.]/g, ''))} placeholder="12500000" /></Field>
        <Field label="Down payment (paid)"><input className={inputClass} value={f.downpayment} onChange={e => set('downpayment', e.target.value.replace(/[^\d.]/g, ''))} placeholder="2500000" /></Field>
        <Field label="Balance (due)"><input className={`${inputClass} bg-slate-100`} value={inr(calc.balance)} disabled /></Field>
        <Field label="Monthly amount (₹/month)" required hint="Per-month figure"><input className={inputClass} value={f.monthlyAmount} onChange={e => set('monthlyAmount', e.target.value.replace(/[^\d.]/g, ''))} placeholder="50000" /></Field>
        <Field label="Pay frequency">
          <select className={inputClass} value={f.gapMonths} onChange={e => set('gapMonths', Number(e.target.value))}>
            {[1, 2, 3, 6].map(g => <option key={g} value={g}>{FREQ_LABEL[g]}</option>)}
          </select>
        </Field>
        <Field label="First due date" required><input type="date" className={inputClass} value={f.firstDueDate} onChange={e => set('firstDueDate', e.target.value)} /></Field>
        <Field label="Agreement / start date"><input type="date" className={inputClass} value={f.startDate} onChange={e => set('startDate', e.target.value)} /></Field>
      </div>

      {/* Live computed summary */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm">
        <div className="font-semibold text-indigo-900 mb-1">Calculated plan</div>
        {calc.count > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-indigo-900">
            <span>Installments: <b>{calc.count}</b> ({FREQ_LABEL[calc.gap]})</span>
            <span>Each installment: <b>{inr(calc.per)}</b></span>
            <span>Total months: <b>{calc.months}</b></span>
            <span>Payment day: <b>{calc.payDay ? `${calc.payDay}th` : '—'}</b></span>
            <span className="col-span-2">Ends on: <b>{calc.endDate || '—'}</b></span>
          </div>
        ) : <div className="text-indigo-700">Enter final amount, monthly amount & first due date to see the schedule.</div>}
      </div>

      {/* Overdue / late-fee rule */}
      <div className="rounded-lg border border-slate-200 p-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" checked={f.lateFeeEnabled} onChange={e => set('lateFeeEnabled', e.target.checked)} />
          Apply overdue / late-payment charge
        </label>
        {f.lateFeeEnabled && (
          <>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Field label="Grace days after due" hint="Charge starts after this many days"><input className={inputClass} value={f.lateFeeGraceDays} onChange={e => set('lateFeeGraceDays', e.target.value.replace(/[^\d]/g, ''))} placeholder="2" /></Field>
              <Field label="Charge type">
                <select className={inputClass} value={f.lateFeeType} onChange={e => set('lateFeeType', e.target.value)}>
                  <option value="flat">Flat amount (₹)</option>
                  <option value="percent">% of installment</option>
                </select>
              </Field>
              <Field label={f.lateFeeType === 'percent' ? 'Charge (%)' : 'Charge amount (₹)'}><input className={inputClass} value={f.lateFeeValue} onChange={e => set('lateFeeValue', e.target.value.replace(/[^\d.]/g, ''))} placeholder={f.lateFeeType === 'percent' ? '2' : '1000'} /></Field>
              <Field label="When payable">
                <select className={inputClass} value={f.lateFeeMode} onChange={e => set('lateFeeMode', e.target.value)}>
                  <option value="separate">Separate — pay after all installments</option>
                  <option value="final">Add to outstanding now</option>
                </select>
              </Field>
            </div>
            <p className="text-xs text-slate-400 mt-1">Charge accrues per overdue installment, calculated live from today's date.</p>
          </>
        )}
      </div>

      <Field label="Notes"><textarea rows={2} className={inputClass} value={f.notes} onChange={e => set('notes', e.target.value)} /></Field>
    </FormModal>
  );
}

// Record a payment (cash counter / admin).
export function MarkPaidModal({ open, installment, onClose, onSaved }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ method: 'Cash', txnId: '', paidAt: '', amount: '' });

  useEffect(() => {
    if (!open) return;
    setF({ method: 'Cash', txnId: '', paidAt: new Date().toISOString().slice(0, 10), amount: installment?.amount ?? '' });
  }, [open, installment]);

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  async function submit() {
    setBusy(true);
    try {
      await api.post(`/admin/payment-plan/installment/${installment.id}/pay`, {
        method: f.method, txnId: f.txnId || null, paidAt: f.paidAt || null,
        amount: f.amount === '' ? null : Number(f.amount),
      });
      toast.success('Marked as paid — resident notified');
      onSaved && onSaved();
      onClose();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  if (!installment) return null;
  return (
    <FormModal open={open} title={`Record payment · ${installment.label}`} onClose={onClose} onSubmit={submit} submitting={busy} submitLabel="Mark paid">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Method">
          <select className={inputClass} value={f.method} onChange={e => set('method', e.target.value)}>
            {PAY_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Paid on"><input type="date" className={inputClass} value={f.paidAt} onChange={e => set('paidAt', e.target.value)} /></Field>
        <Field label="Amount"><input className={inputClass} value={f.amount} onChange={e => set('amount', e.target.value.replace(/[^\d.]/g, ''))} /></Field>
        <Field label="Txn / Receipt no."><input className={inputClass} value={f.txnId} onChange={e => set('txnId', e.target.value)} placeholder="optional" /></Field>
      </div>
    </FormModal>
  );
}

// Add / edit a single installment.
export function InstallmentModal({ open, propertyId, installment, onClose, onSaved }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const isEdit = !!installment;
  const [f, setF] = useState({ label: '', amount: '', dueDate: '' });

  useEffect(() => {
    if (!open) return;
    setF({ label: installment?.label || '', amount: installment?.amount ?? '', dueDate: dateVal(installment?.dueDate) });
  }, [open, installment]);

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  async function submit() {
    if (!f.amount) { toast.error('Amount is required'); return; }
    setBusy(true);
    try {
      const body = { label: f.label || 'Installment', amount: Number(f.amount), dueDate: f.dueDate || null };
      if (isEdit) await api.put(`/admin/payment-plan/installment/${installment.id}`, body);
      else await api.post(`/admin/payment-plan/property/${propertyId}/installments`, body);
      toast.success(isEdit ? 'Installment updated' : 'Installment added');
      onSaved && onSaved();
      onClose();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  return (
    <FormModal open={open} title={isEdit ? 'Edit installment' : 'Add installment'} onClose={onClose} onSubmit={submit} submitting={busy} submitLabel={isEdit ? 'Save' : 'Add'}>
      <Field label="Label"><input className={inputClass} value={f.label} onChange={e => set('label', e.target.value)} placeholder="e.g. Installment 5" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount" required><input className={inputClass} value={f.amount} onChange={e => set('amount', e.target.value.replace(/[^\d.]/g, ''))} /></Field>
        <Field label="Due date"><input type="date" className={inputClass} value={f.dueDate} onChange={e => set('dueDate', e.target.value)} /></Field>
      </div>
    </FormModal>
  );
}
