import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormModal, { Field, inputClass } from '../../components/FormModal';
import ResidentFormModal from './ResidentFormModal';
import PropertyFormModal from './PropertyFormModal';
import { fmtDate, fmtDateTime } from '../../lib/format';

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

  return (
    <div>
      <button onClick={() => navigate('/users')} className="text-sm text-slate-500 hover:text-slate-700 mb-3">← Back to residents</button>

      <div className="flex items-center gap-3 mb-6">
        {user.profilePhoto ? (
          <img src={user.profilePhoto} alt="" className="w-12 h-12 rounded-full object-cover border border-slate-200" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-brand-primary text-white grid place-items-center text-lg font-bold">
            {(user.name || user.mobile || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-800">{user.name || 'Unnamed resident'}</h2>
          <div className="text-slate-500 text-sm flex items-center gap-2">
            {user.mobile}
            {/* KYC removed for now */}
            <StatusBadge status={user.isActive ? 'active' : 'inactive'}>{user.isActive ? 'Active' : 'Blocked'}</StatusBadge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditOpen(true)} className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-slate-300 hover:bg-slate-50">Edit</button>
          <button onClick={() => setDelUser(true)} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700">Delete</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Profile">
          <Row label="Phone" value={user.mobile} />
          <Row label="Email" value={user.email} />
          <Row label="Address" value={[user.addressLine, user.city, user.state, user.pincode].filter(Boolean).join(', ') || '—'} />
          <Row label="Primary booking" value={user.primaryBookingId} />
          <Row label="Added" value={fmtDate(user.createdAt)} />
        </Card>

        {/* KYC review removed for now — kept out of the portal per product decision. */}

        <Card title="Emergency contacts">
          {user.emergencyContacts.length === 0 ? (
            <p className="text-sm text-slate-400">No contacts added.</p>
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
              {user.properties.map(p => (
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-4">
        <Card title={`Activity & bookings (${activity.length})`}>
          {activity.length === 0 ? (
            <p className="text-sm text-slate-400">No bookings or orders yet.</p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {activity.map(a => (
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
        </Card>
      </div>

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
