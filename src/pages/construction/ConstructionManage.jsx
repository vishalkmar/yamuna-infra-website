import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import ConfirmDialog from '../../components/ConfirmDialog';
import { fmtDate } from '../../lib/format';
import { OverallModal, StepModal, EntryModal, UpdateModal, statusMeta } from './constructionModals';

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

export default function ConstructionManage() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [overallOpen, setOverallOpen] = useState(false);
  const [stepModal, setStepModal] = useState(null);   // null | {step?}
  const [entryModal, setEntryModal] = useState(null); // null | {step, entry?}
  const [updateOpen, setUpdateOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);       // { kind, id, label }
  const [busy, setBusy] = useState(false);

  const dragFrom = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get(`/admin/construction/property/${propertyId}`);
      setData(res.data);
    } catch (e) {
      toast.error(apiError(e, 'Could not load construction data'));
    } finally {
      setLoading(false);
    }
  }, [propertyId, toast]);

  useEffect(() => { load(); }, [load]);

  async function persistOrder(steps) {
    try {
      await api.put(`/admin/construction/property/${propertyId}/steps/reorder`, { order: steps.map(s => s.id) });
    } catch (e) { toast.error(apiError(e, 'Could not save order')); load(); }
  }

  function reorder(from, to) {
    if (from === to || from == null || to == null) return;
    setData(d => {
      const steps = [...d.steps];
      const [moved] = steps.splice(from, 1);
      steps.splice(to, 0, moved);
      persistOrder(steps);
      return { ...d, steps };
    });
  }
  const move = (i, dir) => reorder(i, i + dir);

  async function doDelete() {
    setBusy(true);
    try {
      const { kind, id } = confirm;
      if (kind === 'step') await api.delete(`/admin/construction/steps/${id}`);
      else if (kind === 'entry') await api.delete(`/admin/construction/entries/${id}`);
      else if (kind === 'update') await api.delete(`/admin/construction/updates/${id}`);
      toast.success('Deleted');
      setConfirm(null);
      load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  if (loading) return <div className="text-slate-400">Loading…</div>;
  if (!data) return <div className="text-slate-400">Not found.</div>;

  const { property, steps, updates } = data;

  return (
    <div>
      <button onClick={() => navigate('/construction')} className="text-sm text-slate-500 hover:text-slate-700 mb-3">← Back to construction</button>

      {/* Overall card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
        <div className="flex items-center gap-4">
          <ProgressRing pct={property.workPercent} />
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-800">{property.label || property.flatNo || 'Property'}</h2>
            <div className="text-sm text-slate-500">
              {[property.residentName, property.projectName, property.tower && `Tower ${property.tower}`, property.flatNo].filter(Boolean).join(' · ')}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-sm">
              <span className={`px-2 py-0.5 rounded-full text-xs ${property.workStatus === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {property.workStatus === 'completed' ? 'Completed' : 'Expected'}
              </span>
              {property.workTargetDate && <span className="text-slate-600">📅 {fmtDate(property.workTargetDate)}</span>}
              {(property.floorsTotal != null) && <span className="text-slate-600">🏢 {property.floorsDone ?? 0}/{property.floorsTotal} floors</span>}
            </div>
          </div>
          <button onClick={() => setOverallOpen(true)} className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-slate-300 hover:bg-slate-50">Edit progress</button>
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-slate-800">Construction steps <span className="text-slate-400 font-normal">({steps.length})</span></h3>
        <button onClick={() => setStepModal({})} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-brand-primary hover:opacity-90">+ Add step</button>
      </div>
      <p className="text-xs text-slate-400 mb-3">Drag the ⠿ handle (or use ↑↓) to reorder the sequence.</p>

      {steps.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400 mb-6">No steps yet.</div>
      ) : (
        <div className="space-y-3 mb-6">
          {steps.map((s, i) => {
            const meta = statusMeta(s.status);
            return (
              <div
                key={s.id}
                className="bg-white rounded-xl border border-slate-200 p-4"
                onDragOver={e => e.preventDefault()}
                onDrop={() => { reorder(dragFrom.current, i); dragFrom.current = null; }}
              >
                <div className="flex items-start gap-3">
                  <div
                    draggable
                    onDragStart={() => { dragFrom.current = i; }}
                    className="cursor-grab text-slate-300 hover:text-slate-500 pt-1 select-none"
                    title="Drag to reorder"
                  >⠿</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800">{i + 1}. {s.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${meta.cls}`}>{meta.label}</span>
                      <span className="text-xs text-slate-500">{s.percent || 0}%</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-slate-500">
                      {s.expectedDate && <span>Expected: {fmtDate(s.expectedDate)}</span>}
                      {s.completedDate && <span>Completed: {fmtDate(s.completedDate)}</span>}
                      {s.floorsReached && <span>🏢 {s.floorsReached}</span>}
                    </div>
                    {s.notes && <p className="text-sm text-slate-600 mt-1">{s.notes}</p>}

                    {/* Entries */}
                    <div className="mt-3 pl-3 border-l-2 border-slate-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-500">Entries ({s.entries.length})</span>
                        <button onClick={() => setEntryModal({ step: s })} className="text-xs font-semibold text-brand-primary hover:underline">+ Add entry</button>
                      </div>
                      {s.entries.length === 0 ? (
                        <p className="text-xs text-slate-400">No entries.</p>
                      ) : s.entries.map(e => (
                        <div key={e.id} className="py-2 border-b border-slate-50 last:border-0">
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-slate-700 font-medium">{e.title || 'Entry'} <span className="text-xs text-slate-400 font-normal">{e.entryDate ? `· ${fmtDate(e.entryDate)}` : ''}</span></div>
                            <div className="flex gap-2 text-xs">
                              <button onClick={() => setEntryModal({ step: s, entry: e })} className="text-brand-primary font-semibold hover:underline">Edit</button>
                              <button onClick={() => setConfirm({ kind: 'entry', id: e.id })} className="text-rose-600 font-semibold hover:underline">Delete</button>
                            </div>
                          </div>
                          {e.note && <p className="text-xs text-slate-500 mt-0.5">{e.note}</p>}
                          {e.images?.length > 0 && (
                            <div className="flex gap-2 mt-1 flex-wrap">
                              {e.images.map((im, idx) => (
                                <img key={idx} src={im.url} alt={im.caption || ''} title={im.caption || ''} className="w-14 h-14 object-cover rounded border border-slate-200" />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex gap-1">
                      <button onClick={() => move(i, -1)} disabled={i === 0} className="px-2 py-0.5 rounded border border-slate-200 text-xs disabled:opacity-30">↑</button>
                      <button onClick={() => move(i, 1)} disabled={i === steps.length - 1} className="px-2 py-0.5 rounded border border-slate-200 text-xs disabled:opacity-30">↓</button>
                    </div>
                    <button onClick={() => setStepModal({ step: s })} className="text-xs text-slate-600 font-semibold hover:underline">Edit</button>
                    <button onClick={() => setConfirm({ kind: 'step', id: s.id })} className="text-xs text-rose-600 font-semibold hover:underline">Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Weekly updates */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-slate-800">Weekly updates <span className="text-slate-400 font-normal">({updates.length})</span></h3>
        <button onClick={() => setUpdateOpen(true)} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-brand-primary hover:opacity-90">+ Post update</button>
      </div>
      {updates.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400">No updates posted.</div>
      ) : (
        <div className="space-y-2">
          {updates.map(u => (
            <div key={u.id} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
              {u.mediaUrl && u.mediaType === 'image' && <img src={u.mediaUrl} alt="" className="w-16 h-12 object-cover rounded" />}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800">{u.title}</div>
                {u.description && <div className="text-sm text-slate-500 truncate">{u.description}</div>}
                <div className="text-xs text-slate-400">{fmtDate(u.postedAt)} · {u.mediaType}</div>
              </div>
              <button onClick={() => setConfirm({ kind: 'update', id: u.id })} className="text-rose-600 text-sm font-semibold hover:underline">Delete</button>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <OverallModal open={overallOpen} propertyId={propertyId} overall={property} onClose={() => setOverallOpen(false)} onSaved={load} />
      <StepModal open={!!stepModal} propertyId={propertyId} step={stepModal?.step} onClose={() => setStepModal(null)} onSaved={load} />
      <EntryModal open={!!entryModal} step={entryModal?.step} entry={entryModal?.entry} onClose={() => setEntryModal(null)} onSaved={load} />
      <UpdateModal open={updateOpen} propertyId={propertyId} onClose={() => setUpdateOpen(false)} onSaved={load} />
      <ConfirmDialog
        open={!!confirm}
        title="Delete?"
        message="This cannot be undone."
        confirmLabel="Delete"
        danger
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={doDelete}
      />
    </div>
  );
}
