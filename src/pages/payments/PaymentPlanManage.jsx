import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import ConfirmDialog from '../../components/ConfirmDialog';
import { fmtDate, fmtMoney } from '../../lib/format';
import { FREQ_LABEL } from '../../lib/loan';
import { PlanModal, MarkPaidModal, InstallmentModal, STATUS_CLS } from './paymentPlanModals';

function Stat({ label, value, color }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-lg font-bold ${color || 'text-slate-800'}`}>{value}</div>
    </div>
  );
}

function ProgressRing({ pct }) {
  const p = Math.max(0, Math.min(100, pct || 0));
  return (
    <div className="relative w-20 h-20 shrink-0">
      <div className="w-20 h-20 rounded-full" style={{ background: `conic-gradient(#4f46e5 ${p * 3.6}deg, #e2e8f0 0deg)` }} />
      <div className="absolute inset-1.5 bg-white rounded-full grid place-items-center">
        <span className="text-lg font-bold text-slate-800">{p}%</span>
      </div>
    </div>
  );
}

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'transactions', label: 'Transactions' },
];

export default function PaymentPlanManage() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [planOpen, setPlanOpen] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [instModal, setInstModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get(`/admin/payment-plan/property/${propertyId}`);
      setData(res.data);
    } catch (e) { toast.error(apiError(e, 'Could not load plan')); } finally { setLoading(false); }
  }, [propertyId, toast]);

  useEffect(() => { load(); }, [load]);

  async function downloadStatement() {
    setDownloading(true);
    try {
      const res = await api.get(`/admin/payment-plan/property/${propertyId}/statement.pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `statement-${data?.property?.flatNo || propertyId}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) { toast.error(apiError(e, 'Could not download statement')); } finally { setDownloading(false); }
  }

  async function doConfirm() {
    setBusy(true);
    try {
      const { kind, id } = confirm;
      if (kind === 'unpay') await api.post(`/admin/payment-plan/installment/${id}/unpay`);
      else if (kind === 'delInst') await api.delete(`/admin/payment-plan/installment/${id}`);
      toast.success('Done'); setConfirm(null); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  if (loading) return <div className="text-slate-400">Loading…</div>;
  if (!data) return <div className="text-slate-400">Not found.</div>;

  const { property, plan, installments } = data;
  const hasPlan = !!plan;
  const paid = installments.filter(i => i.isPaid);
  const overdue = installments.filter(i => i.status === 'overdue');
  const nextDue = installments.filter(i => !i.isPaid).sort((a, b) => (a.dueDate || '') < (b.dueDate || '') ? -1 : 1)[0] || null;

  return (
    <div>
      <button onClick={() => navigate('/payment-plan')} className="text-sm text-slate-500 hover:text-slate-700 mb-3">← Back to payments</button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <div className="flex items-start gap-4">
          <ProgressRing pct={data.progressPct} />
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-800">{property.label || property.flatNo || 'Property'}</h2>
            <div className="text-sm text-slate-500">{[property.residentName, property.projectName, property.flatNo].filter(Boolean).join(' · ')}</div>
            <div className="text-xs text-slate-400 mt-1">{property.residentEmail} · {property.residentMobile ? `+91 ${property.residentMobile}` : ''}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={downloadStatement} disabled={downloading} className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-slate-300 hover:bg-slate-50 disabled:opacity-50">
              {downloading ? 'Generating…' : '⬇ Statement (PDF)'}
            </button>
            <button onClick={() => setPlanOpen(true)} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-brand-primary hover:opacity-90">
              {hasPlan ? 'Edit plan' : 'Set up plan'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <Stat label="Agreement" value={fmtMoney(data.totalAgreementValue)} />
          <Stat label="Paid" value={fmtMoney(data.totalPaid)} color="text-emerald-700" />
          <Stat label="Outstanding" value={fmtMoney(data.outstanding)} color="text-rose-600" />
          <Stat label="Overdue" value={`${overdue.length}`} color={overdue.length ? 'text-rose-600' : 'text-slate-800'} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1 w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold ${tab === t.key ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {!hasPlan && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400 mb-4">
          No payment plan yet. Click “Set up plan” to create the installment schedule.
        </div>
      )}

      {/* Overview module */}
      {tab === 'overview' && hasPlan && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-800 mb-3">Plan</h3>
            <Row label="Final amount" value={fmtMoney(plan.totalAmount)} />
            <Row label="Down payment" value={fmtMoney(plan.downpayment)} />
            <Row label="Monthly amount" value={fmtMoney(plan.monthlyAmount)} />
            <Row label="Frequency" value={FREQ_LABEL[plan.gapMonths] || plan.frequency} />
            <Row label="Per installment" value={fmtMoney(plan.installmentAmount)} />
            <Row label="Installments" value={plan.installmentCount} />
            <Row label="First due" value={fmtDate(plan.firstDueDate)} />
            <Row label="Ends" value={fmtDate(plan.endDate)} />
            <Row label="Late fee" value={plan.lateFeeEnabled
              ? `${plan.lateFeeType === 'percent' ? plan.lateFeeValue + '%' : fmtMoney(plan.lateFeeValue)} after ${plan.lateFeeGraceDays}d (${plan.lateFeeMode === 'final' ? 'add now' : 'at end'})`
              : 'None'} />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-800 mb-3">Next due</h3>
            {nextDue ? (
              <>
                <div className="text-2xl font-bold text-slate-800">{fmtMoney(nextDue.amount)}</div>
                <div className="text-sm text-slate-500">{nextDue.label} · due {fmtDate(nextDue.dueDate)}</div>
                <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${STATUS_CLS[nextDue.status]}`}>{nextDue.status}</span>
                <button onClick={() => setPayTarget(nextDue)} className="block mt-3 px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700">Record payment</button>
              </>
            ) : <p className="text-sm text-emerald-700 font-semibold">🎉 Fully paid — no dues.</p>}
            {data.lateCharges > 0 && (
              <div className="mt-3 text-sm rounded-lg bg-rose-50 border border-rose-200 p-2 text-rose-700">
                Late charges accrued: <b>{fmtMoney(data.lateCharges)}</b> ({data.lateCount} overdue) · Total payable <b>{fmtMoney(data.totalPayable)}</b>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-500">
              {paid.length} of {installments.length} installments paid · {fmtMoney(data.totalPaid)} collected
            </div>
          </div>
        </div>
      )}

      {/* Schedule module */}
      {tab === 'schedule' && (
        <>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-slate-800">Full schedule <span className="text-slate-400 font-normal">({installments.length})</span></h3>
            <button onClick={() => setInstModal({})} className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-slate-300 hover:bg-slate-50">+ Add installment</button>
          </div>
          {installments.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400">No installments yet.</div>
          ) : <InstallmentTable rows={installments} onPay={setPayTarget} onEdit={i => setInstModal({ installment: i })} onConfirm={setConfirm} />}
        </>
      )}

      {/* Transactions module */}
      {tab === 'transactions' && (
        <>
          <h3 className="font-bold text-slate-800 mb-2">Payment transactions <span className="text-slate-400 font-normal">({paid.length})</span></h3>
          {paid.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400">No payments recorded yet.</div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr><th className="text-left px-4 py-2">Installment</th><th className="text-left px-4 py-2">Paid on</th><th className="text-left px-4 py-2">Method</th><th className="text-left px-4 py-2">Source</th><th className="text-left px-4 py-2">Txn</th><th className="text-right px-4 py-2">Amount</th></tr>
                </thead>
                <tbody>
                  {paid.sort((a, b) => (a.paidAt || '') < (b.paidAt || '') ? 1 : -1).map(i => (
                    <tr key={i.id} className="border-t border-slate-100">
                      <td className="px-4 py-2 text-slate-800">{i.label}</td>
                      <td className="px-4 py-2 text-slate-600">{fmtDate(i.paidAt)}</td>
                      <td className="px-4 py-2">{i.method || '—'}</td>
                      <td className="px-4 py-2"><span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{i.source || '—'}</span></td>
                      <td className="px-4 py-2 text-slate-500 text-xs">{i.txnId || '—'}</td>
                      <td className="px-4 py-2 text-right font-medium text-emerald-700">{fmtMoney(i.paidAmount ?? i.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <PlanModal open={planOpen} propertyId={propertyId} plan={plan} onClose={() => setPlanOpen(false)} onSaved={load} />
      <MarkPaidModal open={!!payTarget} installment={payTarget} onClose={() => setPayTarget(null)} onSaved={load} />
      <InstallmentModal open={!!instModal} propertyId={propertyId} installment={instModal?.installment} onClose={() => setInstModal(null)} onSaved={load} />
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.kind === 'unpay' ? 'Mark as unpaid?' : 'Delete installment?'}
        message={confirm?.kind === 'unpay' ? 'This clears the recorded payment for this installment.' : 'This removes the installment from the schedule.'}
        confirmLabel={confirm?.kind === 'unpay' ? 'Mark unpaid' : 'Delete'}
        danger busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={doConfirm}
      />
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-slate-50 last:border-0 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-800 font-medium">{value ?? '—'}</span>
    </div>
  );
}

function InstallmentTable({ rows, onPay, onEdit, onConfirm }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
          <tr>
            <th className="text-left px-4 py-2">#</th>
            <th className="text-left px-4 py-2">Installment</th>
            <th className="text-left px-4 py-2">Due</th>
            <th className="text-right px-4 py-2">Amount</th>
            <th className="text-left px-4 py-2">Status</th>
            <th className="text-left px-4 py-2">Paid</th>
            <th className="text-right px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(i => (
            <tr key={i.id} className="border-t border-slate-100">
              <td className="px-4 py-2 text-slate-400">{i.seq}</td>
              <td className="px-4 py-2 text-slate-800">{i.label}</td>
              <td className="px-4 py-2 text-slate-600">{fmtDate(i.dueDate)}</td>
              <td className="px-4 py-2 text-right font-medium">{fmtMoney(i.amount)}</td>
              <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CLS[i.status]}`}>{i.status}</span></td>
              <td className="px-4 py-2 text-xs text-slate-500">{i.isPaid ? `${fmtDate(i.paidAt)}${i.method ? ` · ${i.method}` : ''}${i.source ? ` (${i.source})` : ''}` : '—'}</td>
              <td className="px-4 py-2">
                <div className="flex gap-2 justify-end text-xs">
                  {i.isPaid
                    ? <button onClick={() => onConfirm({ kind: 'unpay', id: i.id })} className="text-amber-600 font-semibold hover:underline">Unpay</button>
                    : <button onClick={() => onPay(i)} className="text-emerald-700 font-semibold hover:underline">Mark paid</button>}
                  <button onClick={() => onEdit(i)} className="text-brand-primary font-semibold hover:underline">Edit</button>
                  <button onClick={() => onConfirm({ kind: 'delInst', id: i.id })} className="text-rose-600 font-semibold hover:underline">Del</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
