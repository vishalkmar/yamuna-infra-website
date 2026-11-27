import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormModal, { Field, inputClass } from '../../components/FormModal';
import ResidentFormModal from './ResidentFormModal';
import PropertyFormModal from './PropertyFormModal';
import { fmtDate, fmtDateTime } from '../../lib/format';
import { Kpi, KpiGrid, Panel, BarList, TrendBars, Progress, PagedTable, Pill, Chips, moneyCompact } from '../../components/Dash';
import { inr, shortDate, exportCsv, daysBetween } from '../../lib/dash';
import CommsLog from '../comms/CommsLog';
import ResidentActions, { ResidentAudit } from './ResidentActions';
import { AppPayments } from '../comms/Communications';

function Card({ title, children, action }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-slate-800">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-slate-50 last:border-0 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-800 font-medium text-right">{value ?? '—'}</span>
    </div>
  );
}

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null); // { kind: 'block'|'unblock'|'approve' }
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [propModal, setPropModal] = useState(null); // null | { property?: {...} }
  const [delUser, setDelUser] = useState(false);
  const [delProp, setDelProp] = useState(null); // property to delete
  const [crm, setCrm] = useState(null); // 360° financial + activity view
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'overview');
  const [instFilter, setInstFilter] = useState('all');
  const [actKind, setActKind] = useState('');
  const [welcomeBusy, setWelcomeBusy] = useState(false);
  const [commsKey, setCommsKey] = useState(0);
  const urlTab = searchParams.get('tab');
  useEffect(() => { if (urlTab) setTab(urlTab); }, [urlTab, id]);

  const sendWelcome = async () => {
    setWelcomeBusy(true);
    try {
      const { data } = await api.post(`/admin/users/${id}/send-welcome`, {}, { timeout: 90000 });
      if (data.data?.emailStatus === 'sent') toast.success('Account summary emailed with PDF');
      else toast.error(data.message || 'Saved, but the email could not be sent');
      setCommsKey(k => k + 1);
    } catch (e) { toast.error(apiError(e, 'Could not send')); } finally { setWelcomeBusy(false); }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, a] = await Promise.all([
        api.get(`/admin/users/${id}`),
        api.get(`/admin/users/${id}/bookings`),
      ]);
      setUser(u.data.data);
      setNotes(u.data.data.adminNotes || '');
      setActivity(a.data.data);
      // The 360° view is extra; the page still works if it fails.
      api.get(`/admin/crm/residents/${id}`, { timeout: 60000 })
        .then(r => setCrm(r.data.data))
        .catch(() => setCrm(null));
    } catch (e) {
      toast.error(apiError(e, 'Could not load resident'));
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { load(); }, [load]);

  async function doStatus(active) {
    setBusy(true);
    try {
      await api.post(`/admin/users/${id}/status`, { active });
      toast.success(active ? 'Resident unblocked' : 'Resident blocked');
      setConfirm(null);
      load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function approveKyc() {
    setBusy(true);
    try {
      await api.post(`/admin/users/${id}/kyc/approve`, {});
      toast.success('KYC approved');
      setConfirm(null);
      load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function rejectKyc() {
    setBusy(true);
    try {
      await api.post(`/admin/users/${id}/kyc/reject`, { reason: rejectReason });
      toast.success('KYC rejected');
      setRejectOpen(false); setRejectReason('');
      load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function saveNotes() {
    setBusy(true);
    try {
      await api.post(`/admin/users/${id}/notes`, { notes });
      toast.success('Notes saved');
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function deleteResident() {
    setBusy(true);
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success('Resident deleted');
      navigate('/users');
    } catch (e) { toast.error(apiError(e)); setBusy(false); }
  }

  async function downloadStatement(p) {
    try {
      const res = await api.get(`/admin/payment-plan/property/${p.id}/statement.pdf`, { responseType: 'blob', timeout: 60000 });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `statement-${(user?.name || 'resident').replace(/\s+/g, '-')}-${p.flatNo || p.id}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { toast.error(apiError(e, 'Could not download statement')); }
  }

  async function deleteProperty() {
    setBusy(true);
    try {
      await api.delete(`/admin/users/${id}/properties/${delProp.id}`);
      toast.success('Property removed');
      setDelProp(null);
      load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  if (loading) return <div className="text-slate-400">Loading…</div>;
  if (!user) return <div className="text-slate-400">Resident not found.</div>;

  const s = crm?.summary;
  const ledger = crm?.ledger || [];
  const paidRows = ledger.filter(i => i.isPaid).sort((a, b) => (String(a.paidAt) < String(b.paidAt) ? 1 : -1));
  const instRows = ledger.filter(i => instFilter === 'all' || i.status === instFilter);
  const kinds = crm ? Object.entries(crm.activityByKind).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value) : [];
  const shownActivity = actKind ? activity.filter(a => a.kind === actKind) : activity;
  const TABS = [
    ['overview', '👤 Overview'],
    ['payments', `💳 Payments & dues${s?.overdueCount ? ` (${s.overdueCount} overdue)` : ''}`],
    ['history', `🧾 Receipts (${paidRows.length})`],
    ['documents', `📘 Dockets (${crm?.documents?.length ?? 0})`],
    ['activity', `🛎️ Bookings (${activity.length})`],
    ['actions', '⚡ Actions'],
    ['comms', '📨 Emails & vouchers'],
    ['audit', '🛡️ Who did what'],
    ['apppay', '💳 App payments'],
    ['timeline', '🕒 Timeline'],
  ];

  return (
    <div>
      <button onClick={() => navigate('/users')} className="text-sm text-slate-500 hover:text-slate-700 mb-3">← Back to residents</button>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        {user.profilePhoto ? (
          <img src={user.profilePhoto} alt="" className="w-14 h-14 rounded-full object-cover border border-slate-200" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-brand-primary text-white grid place-items-center text-xl font-bold">
            {(user.name || user.mobile || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-[200px]">
          <h2 className="text-xl font-bold text-slate-800">{user.name || 'Unnamed resident'}</h2>
          <div className="text-slate-500 text-sm flex flex-wrap items-center gap-2">
            {user.mobile}
            {user.email && <span>· {user.email}</span>}
            <StatusBadge status={user.isActive ? 'active' : 'inactive'}>{user.isActive ? 'Active' : 'Blocked'}</StatusBadge>
            {s && <Pill tone={s.overdueCount ? 'red' : s.pendingInstallments ? 'blue' : s.totalInstallments ? 'green' : 'slate'}>
              {s.overdueCount ? `${s.overdueCount} overdue` : s.pendingInstallments ? 'Payments on track' : s.totalInstallments ? 'Fully paid' : 'No payment plan'}
            </Pill>}
            <span className="text-xs text-slate-400">Customer since {fmtDate(user.createdAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 hover:bg-slate-50">↻</button>
          <button onClick={() => setEditOpen(true)} className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-slate-300 hover:bg-slate-50">Edit</button>
          <button onClick={() => setDelUser(true)} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700">Delete</button>
        </div>
      </div>

      {s && (
        <KpiGrid cols="grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          <Kpi label="Agreement value" value={moneyCompact(s.agreement)} sub={`${user.properties?.length || 0} property`} />
          <Kpi label="Paid" value={moneyCompact(s.paid)} tone="good" sub={`${s.progressPct}% complete`} />
          <Kpi label="Outstanding" value={moneyCompact(s.outstanding)} tone="info" />
          <Kpi label="Overdue" value={moneyCompact(s.overdueAmount)} tone={s.overdueCount ? 'bad' : 'muted'} sub={s.overdueCount ? `${s.overdueCount} inst · ${s.maxOverdueDays} days` : 'Nothing overdue'} />
          <Kpi label="Next due" value={s.nextDue ? shortDate(s.nextDue.dueDate) : '—'} tone={s.nextDue && s.nextDue.dueDate < crm.today ? 'bad' : 'default'} sub={s.nextDue ? `${inr(s.nextDue.amount)} · ${s.nextDue.label}` : ''} />
          <Kpi label="Late charges" value={moneyCompact(s.lateCharges)} tone={s.lateCharges ? 'warn' : 'muted'} />
          <Kpi label="Installments paid" value={`${s.paidInstallments} / ${s.totalInstallments}`} sub={`${s.pendingInstallments} pending`} />
          <Kpi label="Down payment" value={moneyCompact(s.downpayment)} />
          <Kpi label="Due this month" value={moneyCompact(s.dueThisMonth)} tone={s.dueThisMonth ? 'warn' : 'muted'} />
          <Kpi label="Last payment" value={s.lastPayment ? shortDate(s.lastPayment.paidAt) : '—'} sub={s.lastPayment ? `${inr(s.lastPayment.paidAmount ?? s.lastPayment.amount)} · ${s.lastPayment.method || 'Cash'}` : ''} />
          <Kpi label="On-time rate" value={s.onTimeRate != null ? `${s.onTimeRate}%` : '—'} />
          <Kpi label="Plan ends" value={s.planEndDate ? shortDate(s.planEndDate) : '—'} />
          <Kpi label="Dockets" value={crm.documents.length} tone={crm.documents.length ? 'good' : 'warn'} sub={crm.documents.length ? '' : 'Missing'} />
          <Kpi label="Bookings & orders" value={activity.length} sub={crm.foodSpend ? `food spend ${inr(crm.foodSpend)}` : ''} />
          <Kpi label="Reward points" value={crm.rewards.points} sub={`${crm.rewards.redemptions.length} voucher(s)`} />
          <Kpi label="SOS raised" value={crm.sos.length} tone={crm.sos.some(x => ['active', 'dispatched'].includes(x.status)) ? 'bad' : 'muted'} sub={crm.ai.questions ? `${crm.ai.questions} AI chats` : ''} />
        </KpiGrid>
      )}

      <div className="flex flex-wrap gap-1 mt-5 mb-4 border-b border-slate-200">
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${tab === key ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{label}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div className="grid lg:grid-cols-2 gap-4">
            <Card title="Profile">
              <Row label="Phone" value={user.mobile} />
              <Row label="Email" value={user.email} />
              <Row label="Address" value={[user.addressLine, user.city, user.state, user.pincode].filter(Boolean).join(', ') || '—'} />
              <Row label="Primary booking" value={user.primaryBookingId} />
              <Row label="Onboarded via" value={user.createdSource === 'app' ? 'App sign-up' : 'Admin portal'} />
              <Row label="Added" value={fmtDate(user.createdAt)} />
              {crm && <Row label="Notifications" value={`${crm.notifications.total} sent · ${crm.notifications.unread} unread`} />}
              {crm && <Row label="AI concierge" value={crm.ai.questions ? `${crm.ai.questions} questions · last ${fmtDate(crm.ai.lastAt)}` : 'Not used yet'} />}
            </Card>

            <Card title="Emergency contacts">
              {user.emergencyContacts.length === 0 ? (
                <p className="text-sm text-amber-600">⚠️ No emergency contacts added — ask the resident to add one in the app.</p>
              ) : (
                <ul className="divide-y divide-slate-50">
                  {user.emergencyContacts.map(c => (
                    <li key={c.id} className="py-2 flex justify-between text-sm">
                      <span className="text-slate-800 font-medium">{c.name} {c.isPrimary ? '⭐' : ''}</span>
                      <span className="text-slate-500">{c.relation || '—'} · {c.phone}</span>
                    </li>
                  ))}
                </ul>
              )}
              {user.medicalProfile && (
                <div className="mt-3 pt-3 border-t border-slate-100 text-sm">
                  <Row label="Blood group" value={user.medicalProfile.bloodGroup} />
                  <Row label="Medical notes" value={user.medicalProfile.medicalNotes} />
                </div>
              )}
            </Card>

            <Card title="Account">
              <Row label="Account status" value={<StatusBadge status={user.isActive ? 'active' : 'inactive'}>{user.isActive ? 'Active' : 'Blocked'}</StatusBadge>} />
              <div className="mt-2">
                {user.isActive ? (
                  <button onClick={() => setConfirm({ kind: 'block' })} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700">Block resident</button>
                ) : (
                  <button onClick={() => setConfirm({ kind: 'unblock' })} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700">Unblock resident</button>
                )}
              </div>
              <div className="mt-4">
                <span className="block text-sm font-medium text-slate-700 mb-1">Internal notes</span>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={inputClass} placeholder="Notes visible to admins only…" />
                <button onClick={saveNotes} disabled={busy} className="mt-2 px-3 py-1.5 rounded-lg text-sm border border-slate-300 hover:bg-slate-50 disabled:opacity-50">Save notes</button>
              </div>
            </Card>

            {crm && (
              <Card title="Rewards & vouchers">
                <Row label="Points balance" value={`${crm.rewards.points} pts`} />
                {crm.rewards.redemptions.length === 0 ? <p className="text-sm text-slate-400 mt-2">No vouchers redeemed yet.</p> : (
                  <ul className="divide-y divide-slate-50 mt-1">
                    {crm.rewards.redemptions.slice(0, 8).map(r => (
                      <li key={r.id} className="py-2 flex justify-between text-sm">
                        <span className="text-slate-800">🎟️ {r.title} <span className="text-xs text-slate-400">({r.points} pts)</span></span>
                        <span className="flex items-center gap-2"><StatusBadge status={r.status} /><span className="text-xs text-slate-400">{fmtDate(r.createdAt)}</span></span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}
          </div>

          <div className="mt-4">
            <Card
              title={`Properties (${user.properties?.length || 0})`}
              action={<button onClick={() => setPropModal({})} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-brand-primary hover:opacity-90">+ Add property</button>}
            >
              {(!user.properties || user.properties.length === 0) ? (
                <p className="text-sm text-slate-400">No properties added yet.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {user.properties.map(p => {
                    const fin = crm?.properties.find(x => x.id === p.id)?.totals;
                    return (
                      <div key={p.id} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-slate-800">
                              {p.label || p.propertyType || 'Property'}
                              {p.flatNo ? <span className="text-slate-500 font-normal"> · {p.flatNo}</span> : ''}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">{p.projectName || '—'}</div>
                          </div>
                          <div className="flex gap-2 text-xs">
                            <button onClick={() => setPropModal({ property: p })} className="text-brand-primary font-semibold hover:underline">Edit</button>
                            <button onClick={() => setDelProp(p)} className="text-rose-600 font-semibold hover:underline">Delete</button>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-slate-600 space-y-0.5">
                          {(p.tower || p.floor) && <div>{[p.tower && `Tower ${p.tower}`, p.floor && `Floor ${p.floor}`].filter(Boolean).join(' · ')}</div>}
                          {p.areaSqft && <div>{p.areaSqft} sq.ft{p.propertyType ? ` · ${p.propertyType}` : ''}</div>}
                          {(p.addressLine || p.city || p.state || p.pincode) && (
                            <div className="text-slate-500">{[p.addressLine, p.city, p.state, p.pincode].filter(Boolean).join(', ')}</div>
                          )}
                          {p.notes && <div className="text-slate-400 italic">{p.notes}</div>}
                          <div className="text-xs text-slate-500">🏗️ Construction: {p.workStatus === 'completed' ? 'Completed' : `${p.workPercent || 0}%`}{p.workTargetDate ? ` · target ${fmtDate(p.workTargetDate)}` : ''}</div>
                          <Progress value={p.workStatus === 'completed' ? 100 : p.workPercent} tone="bg-sky-500" />
                        </div>
                        {fin && fin.agreement > 0 && (
                          <div className="mt-3 pt-2 border-t border-slate-100 text-xs">
                            <div className="flex justify-between text-slate-600"><span>Paid {inr(fin.paid)} of {inr(fin.agreement)}</span><span>{fin.progressPct}%</span></div>
                            <Progress value={fin.progressPct} className="mt-1" />
                            <div className="flex justify-between mt-1 text-slate-500">
                              <span>Outstanding {inr(fin.outstanding)}</span>
                              {fin.overdueCount > 0 && <span className="text-rose-600 font-semibold">{fin.overdueCount} overdue</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {tab === 'payments' && crm && (
        <div className="space-y-4">
          {crm.properties.length === 0 && <Card title="No properties"><p className="text-sm text-slate-400">Add a property to set up a payment plan.</p></Card>}
          {crm.properties.map(p => (
            <Card
              key={p.id}
              title={`${p.label || p.propertyType || 'Property'}${p.flatNo ? ` · ${p.flatNo}` : ''}${p.projectName ? ` — ${p.projectName}` : ''}`}
              action={(
                <div className="flex gap-2">
                  <button onClick={() => downloadStatement(p)} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 hover:bg-slate-50">⬇ Statement PDF</button>
                  <button onClick={() => navigate(`/payment-plan/${p.id}`)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-primary hover:opacity-90">Manage plan →</button>
                </div>
              )}
            >
              {!p.plan && !p.installments.length ? (
                <p className="text-sm text-slate-400">No payment plan yet. Click “Manage plan” to create the schedule.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-sm">
                    <div><div className="text-xs text-slate-400">Agreement</div><div className="font-semibold">{inr(p.totals.agreement)}</div></div>
                    <div><div className="text-xs text-slate-400">Down payment</div><div className="font-semibold">{inr(p.plan?.downpayment)}</div></div>
                    <div><div className="text-xs text-slate-400">Paid</div><div className="font-semibold text-emerald-600">{inr(p.totals.paid)}</div></div>
                    <div><div className="text-xs text-slate-400">Outstanding</div><div className="font-semibold">{inr(p.totals.outstanding)}</div></div>
                    <div><div className="text-xs text-slate-400">Overdue</div><div className={`font-semibold ${p.totals.overdueCount ? 'text-rose-600' : ''}`}>{inr(p.totals.overdueAmount)} ({p.totals.overdueCount})</div></div>
                    <div><div className="text-xs text-slate-400">Late charges</div><div className="font-semibold">{inr(p.totals.lateCharges)}</div></div>
                  </div>
                  <Progress value={p.totals.progressPct} className="mt-3" />
                  {p.plan && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-2">
                      <span>EMI: <b className="text-slate-700">{inr(p.plan.installmentAmount)}</b> {p.plan.frequency}</span>
                      <span>Installments: <b className="text-slate-700">{p.plan.installmentCount}</b></span>
                      <span>Start: <b className="text-slate-700">{shortDate(p.plan.startDate)}</b></span>
                      <span>First due: <b className="text-slate-700">{shortDate(p.plan.firstDueDate)}</b></span>
                      <span>Ends: <b className="text-slate-700">{shortDate(p.plan.endDate)}</b></span>
                      <span>Late fee: <b className="text-slate-700">{p.plan.lateFeeEnabled ? `${p.plan.lateFeeType === 'percent' ? `${p.plan.lateFeeValue}%` : inr(p.plan.lateFeeValue)} after ${p.plan.lateFeeGraceDays} day(s)` : 'Off'}</b></span>
                      {p.totals.nextDue && <span>Next due: <b className={p.totals.nextDue.dueDate < crm.today ? 'text-rose-600' : 'text-slate-700'}>{inr(p.totals.nextDue.amount)} on {shortDate(p.totals.nextDue.dueDate)}</b></span>}
                    </div>
                  )}
                </>
              )}
            </Card>
          ))}


          {ledger.length > 0 && (
            <Panel
              title="Installment schedule"
              action={(
                <Chips
                  value={instFilter}
                  onChange={setInstFilter}
                  options={[['all', 'All'], ['overdue', 'Overdue'], ['due', 'Due now'], ['upcoming', 'Upcoming'], ['paid', 'Paid']].map(([key, label]) => ({ key, label, count: key === 'all' ? ledger.length : ledger.filter(i => i.status === key).length }))}
                />
              )}
            >
              <PagedTable
                rowKey="id"
                pageSize={24}
                rows={instRows}
                initialSort={{ key: 'dueDate', dir: 'asc' }}
                columns={[
                  { key: 'property', header: 'Property' },
                  { key: 'label', header: 'Installment' },
                  { key: 'dueDate', header: 'Due date', render: i => shortDate(i.dueDate) },
                  { key: 'amount', header: 'Amount', align: 'right', render: i => inr(i.amount) },
                  { key: 'status', header: 'Status', render: i => (
                    <div><Pill tone={{ paid: 'green', overdue: 'red', due: 'amber', upcoming: 'slate' }[i.status]}>{i.status === 'due' ? 'Due now' : i.status}</Pill>
                      {i.overdueDays > 0 && <div className="text-[11px] text-rose-500">{i.overdueDays} days late{i.lateFee ? ` · fee ${inr(i.lateFee)}` : ''}</div>}</div>
                  ) },
                  { key: 'paidAt', header: 'Paid on', render: i => (i.isPaid ? shortDate(i.paidAt) : '—') },
                  { key: 'paidAmount', header: 'Paid', align: 'right', render: i => (i.isPaid ? inr(i.paidAmount ?? i.amount) : '—') },
                  { key: 'method', header: 'Mode', render: i => (i.isPaid ? (i.method || 'Cash') : '—') },
                ]}
              />
            </Panel>
          )}
        </div>
      )}

      {tab === 'history' && crm && (
        <Panel
          title="Payment receipts & vouchers"
          subtitle="Every payment recorded against this resident's installments (online via app, or cash/cheque at the office)"
          action={paidRows.length > 0 && (
            <button onClick={() => exportCsv(`receipts-${user.name || user.id}.csv`, [
              { header: 'Receipt / Ref', value: i => i.receiptNo }, { header: 'Paid on', value: i => i.paidAt }, { header: 'Property', value: i => i.property },
              { header: 'Installment', value: i => i.label }, { header: 'Due date', value: i => i.dueDate }, { header: 'Amount', value: i => i.paidAmount ?? i.amount },
              { header: 'Mode', value: i => i.method || 'Cash' }, { header: 'Recorded via', value: i => i.source },
            ], paidRows)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs hover:bg-slate-50">⬇ Export CSV</button>
          )}
        >
          <PagedTable
            rows={paidRows}
            empty="No payments recorded yet."
            columns={[
              { key: 'receiptNo', header: 'Receipt / Ref', render: i => <span className="font-mono text-xs">{i.receiptNo}</span> },
              { key: 'paidAt', header: 'Paid on', render: i => shortDate(i.paidAt) },
              { key: 'property', header: 'Property' },
              { key: 'label', header: 'Towards' },
              { key: 'dueDate', header: 'Was due', render: i => (
                <span>{shortDate(i.dueDate)}{i.dueDate && i.paidAt && i.paidAt > i.dueDate && <span className="text-[11px] text-amber-600"> · {daysBetween(i.paidAt, i.dueDate)}d late</span>}</span>
              ) },
              { key: 'amount', header: 'Amount', align: 'right', render: i => <b>{inr(i.paidAmount ?? i.amount)}</b> },
              { key: 'method', header: 'Mode', render: i => i.method || 'Cash' },
              { key: 'source', header: 'Via', render: i => <Pill tone={i.source === 'online' ? 'blue' : 'slate'}>{i.source === 'online' ? 'App (online)' : i.source === 'cash' ? 'Office' : i.source || 'Admin'}</Pill> },
            ]}
          />
        </Panel>
      )}

      {tab === 'documents' && crm && (
        <Panel title="Booking dockets & documents" subtitle="Shown to the resident in their app" action={<button onClick={() => navigate('/dockets')} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-primary hover:opacity-90">Upload / manage →</button>}>
          {crm.documents.length === 0 ? <p className="text-sm text-amber-600">⚠️ No booking docket uploaded for this resident yet.</p> : (
            <ul className="divide-y divide-slate-100">
              {crm.documents.map(d => (
                <li key={d.id} className="py-2.5 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium text-slate-800">📄 {d.title}</div>
                    <div className="text-xs text-slate-400">{d.kind === 'booking_docket' ? 'Booking docket' : d.kind} · uploaded {fmtDateTime(d.createdAt)}</div>
                  </div>
                  <a href={d.url} target="_blank" rel="noreferrer" className="text-brand-primary font-semibold hover:underline">Open</a>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {tab === 'activity' && (
        <Panel title={`Activity & bookings (${shownActivity.length})`}>
            {shownActivity.length === 0 ? (
              <p className="text-sm text-slate-400">No bookings or orders yet.</p>
            ) : (
              <ul className="divide-y divide-slate-50 max-h-[520px] overflow-y-auto">
                {shownActivity.map(a => (
                  <li key={`${a.kind}-${a.refId}`} className="py-2.5 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="uppercase text-[10px] tracking-wide bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{a.kind}</span>
                      <span className="text-slate-800">{a.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={a.status} />
                      <span className="text-slate-400">{fmtDate(a.eventDate)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
      )}

      {tab === 'comms' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-xl border border-slate-200 px-4 py-3">
            <p className="text-sm text-slate-600">Everything sent to this resident — welcome pack, payment receipts, due reminders, dockets — with the exact PDFs they received.</p>
            <button onClick={sendWelcome} disabled={welcomeBusy} className="px-3 py-1.5 rounded-lg bg-brand-primary text-white text-sm font-semibold disabled:opacity-50">
              {welcomeBusy ? 'Sending…' : '✉️ Send account summary again'}
            </button>
          </div>
          <CommsLog key={commsKey} userId={id} compact />
        </div>
      )}

      {tab === 'apppay' && <AppPayments userId={id} />}

      {tab === 'actions' && <ResidentActions user={user} onSent={() => setCommsKey(k => k + 1)} />}

      {tab === 'audit' && <ResidentAudit userId={id} />}

      {tab === 'timeline' && crm && (
        <Panel title="Resident timeline" subtitle="Payments, dockets, bookings and rewards — newest first">
          <ol className="relative border-l border-slate-200 ml-2">
            {crm.timeline.map((e, i) => (
              <li key={i} className="ml-4 pb-3">
                <span className={`absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full ${e.type === 'payment' ? 'bg-emerald-500' : e.type === 'docket' ? 'bg-sky-500' : e.type === 'sos' ? 'bg-rose-500' : e.type === 'account' ? 'bg-brand-primary' : 'bg-slate-300'}`} />
                <div className="text-xs text-slate-400">{fmtDateTime(e.at)}</div>
                <div className="text-sm text-slate-700">{e.title} {e.status && <StatusBadge status={e.status} />}</div>
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {!crm && tab !== 'overview' && tab !== 'activity' && <p className="text-sm text-slate-400">Financial details could not be loaded.</p>}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.kind === 'approve' ? 'Approve KYC?' : confirm?.kind === 'block' ? 'Block resident?' : 'Unblock resident?'}
        message={confirm?.kind === 'block' ? 'They will lose access until unblocked.' : confirm?.kind === 'approve' ? 'Mark this resident’s KYC as approved.' : 'Restore this resident’s access.'}
        confirmLabel={confirm?.kind === 'approve' ? 'Approve' : confirm?.kind === 'block' ? 'Block' : 'Unblock'}
        danger={confirm?.kind === 'block'}
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm.kind === 'approve') approveKyc();
          else doStatus(confirm.kind === 'unblock');
        }}
      />

      <FormModal open={rejectOpen} title="Reject KYC" onClose={() => setRejectOpen(false)} onSubmit={rejectKyc} submitting={busy} submitLabel="Reject KYC">
        <Field label="Reason" hint="Shown to the resident in the app" required>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} className={inputClass} placeholder="e.g. ID photo unclear" />
        </Field>
      </FormModal>

      <ResidentFormModal
        open={editOpen}
        mode="edit"
        initial={user}
        onClose={() => setEditOpen(false)}
        onSaved={load}
      />

      <PropertyFormModal
        open={!!propModal}
        userId={id}
        property={propModal?.property}
        onClose={() => setPropModal(null)}
        onSaved={load}
      />

      <ConfirmDialog
        open={delUser}
        title="Delete resident?"
        message={`This permanently removes ${user.name || 'this resident'} and all their properties. This cannot be undone.`}
        confirmLabel="Delete"
        danger
        busy={busy}
        onCancel={() => setDelUser(false)}
        onConfirm={deleteResident}
      />

      <ConfirmDialog
        open={!!delProp}
        title="Delete property?"
        message="This removes the property from the resident's account."
        confirmLabel="Delete"
        danger
        busy={busy}
        onCancel={() => setDelProp(null)}
        onConfirm={deleteProperty}
      />
    </div>
  );
}
