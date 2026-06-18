import React, { useEffect, useState } from 'react';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import FormModal, { Field, inputClass } from '../../components/FormModal';
import ImageUploader from '../../components/ImageUploader';

export const STEP_STATUSES = [
  { key: 'planned', label: 'Planned', cls: 'bg-slate-100 text-slate-600' },
  { key: 'in_progress', label: 'In progress', cls: 'bg-amber-100 text-amber-700' },
  { key: 'completed', label: 'Completed', cls: 'bg-emerald-100 text-emerald-700' },
  { key: 'postponed', label: 'Postponed', cls: 'bg-rose-100 text-rose-700' },
  { key: 'on_hold', label: 'On hold', cls: 'bg-violet-100 text-violet-700' },
];

export function statusMeta(key) {
  return STEP_STATUSES.find(s => s.key === key) || STEP_STATUSES[0];
}

const dateVal = d => (d ? String(d).slice(0, 10) : '');

// -------- Overall progress (top card) --------
export function OverallModal({ open, propertyId, overall, onClose, onSaved }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ workStatus: 'expected', workTargetDate: '', workPercent: 0, floorsTotal: '', floorsDone: '' });

  useEffect(() => {
    if (!open) return;
    setF({
      workStatus: overall?.workStatus || 'expected',
      workTargetDate: dateVal(overall?.workTargetDate),
      workPercent: overall?.workPercent ?? 0,
      floorsTotal: overall?.floorsTotal ?? '',
      floorsDone: overall?.floorsDone ?? '',
    });
  }, [open, overall]);

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  async function submit() {
    setBusy(true);
    try {
      await api.put(`/admin/construction/property/${propertyId}/overall`, {
        workStatus: f.workStatus,
        workTargetDate: f.workTargetDate || null,
        workPercent: Number(f.workPercent) || 0,
        floorsTotal: f.floorsTotal === '' ? null : Number(f.floorsTotal),
        floorsDone: f.floorsDone === '' ? null : Number(f.floorsDone),
      });
      toast.success('Progress updated');
      onSaved && onSaved();
      onClose();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  return (
    <FormModal open={open} title="Edit overall progress" onClose={onClose} onSubmit={submit} submitting={busy}>
      <Field label="Target status">
        <select className={inputClass} value={f.workStatus} onChange={e => set('workStatus', e.target.value)}>
          <option value="expected">Expected (in progress)</option>
          <option value="completed">Completed</option>
        </select>
      </Field>
      <Field label={f.workStatus === 'completed' ? 'Completed on' : 'Expected completion date'}>
        <input type="date" className={inputClass} value={f.workTargetDate} onChange={e => set('workTargetDate', e.target.value)} />
      </Field>
      <Field label="Overall work %" hint="0–100, shown on the big card in the app">
        <input type="number" min="0" max="100" className={inputClass} value={f.workPercent} onChange={e => set('workPercent', e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Floors total"><input type="number" min="0" className={inputClass} value={f.floorsTotal} onChange={e => set('floorsTotal', e.target.value)} /></Field>
        <Field label="Floors done"><input type="number" min="0" className={inputClass} value={f.floorsDone} onChange={e => set('floorsDone', e.target.value)} /></Field>
      </div>
    </FormModal>
  );
}

// -------- Step add/edit --------
export function StepModal({ open, propertyId, step, onClose, onSaved }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const isEdit = !!step;
  const [f, setF] = useState({ name: '', status: 'planned', expectedDate: '', completedDate: '', percent: 0, floorsReached: '', coverPhotoUrl: '', notes: '' });

  useEffect(() => {
    if (!open) return;
    setF({
      name: step?.name || '', status: step?.status || 'planned',
      expectedDate: dateVal(step?.expectedDate), completedDate: dateVal(step?.completedDate),
      percent: step?.percent ?? 0, floorsReached: step?.floorsReached || '',
      coverPhotoUrl: step?.coverPhotoUrl || '', notes: step?.notes || '',
    });
  }, [open, step]);

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  async function submit() {
    if (!f.name.trim()) { toast.error('Step name is required'); return; }
    setBusy(true);
    try {
      const body = {
        name: f.name.trim(), status: f.status,
        expectedDate: f.expectedDate || null, completedDate: f.completedDate || null,
        percent: Number(f.percent) || 0, floorsReached: f.floorsReached || null,
        coverPhotoUrl: f.coverPhotoUrl || null, notes: f.notes || null,
      };
      if (isEdit) await api.put(`/admin/construction/steps/${step.id}`, body);
      else await api.post(`/admin/construction/property/${propertyId}/steps`, body);
      toast.success(isEdit ? 'Step updated' : 'Step added');
      onSaved && onSaved();
      onClose();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  return (
    <FormModal open={open} title={isEdit ? 'Edit step' : 'Add step'} onClose={onClose} onSubmit={submit} submitting={busy} submitLabel={isEdit ? 'Save' : 'Add step'}>
      <Field label="Step name" required>
        <input className={inputClass} value={f.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Foundation, Structure, Plastering" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Status">
          <select className={inputClass} value={f.status} onChange={e => set('status', e.target.value)}>
            {STEP_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Work %"><input type="number" min="0" max="100" className={inputClass} value={f.percent} onChange={e => set('percent', e.target.value)} /></Field>
        <Field label="Expected date"><input type="date" className={inputClass} value={f.expectedDate} onChange={e => set('expectedDate', e.target.value)} /></Field>
        <Field label="Completed date"><input type="date" className={inputClass} value={f.completedDate} onChange={e => set('completedDate', e.target.value)} /></Field>
        <Field label="Floors reached"><input className={inputClass} value={f.floorsReached} onChange={e => set('floorsReached', e.target.value)} placeholder="e.g. 8th floor" /></Field>
      </div>
      <ImageUploader value={f.coverPhotoUrl} onChange={v => set('coverPhotoUrl', v)} label="Cover photo" />
      <Field label="Notes"><textarea rows={2} className={inputClass} value={f.notes} onChange={e => set('notes', e.target.value)} /></Field>
    </FormModal>
  );
}

// -------- Entry add/edit (multiple images) --------
export function EntryModal({ open, step, entry, onClose, onSaved }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const isEdit = !!entry;
  const [f, setF] = useState({ title: '', entryDate: '', note: '' });
  const [images, setImages] = useState([]); // [{url, caption}]

  useEffect(() => {
    if (!open) return;
    setF({ title: entry?.title || '', entryDate: dateVal(entry?.entryDate), note: entry?.note || '' });
    setImages(entry?.images ? entry.images.map(i => ({ url: i.url, caption: i.caption || '' })) : []);
  }, [open, entry]);

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const addImage = url => { if (url) setImages(p => [...p, { url, caption: '' }]); };
  const setCaption = (i, c) => setImages(p => p.map((im, idx) => (idx === i ? { ...im, caption: c } : im)));
  const removeImage = i => setImages(p => p.filter((_, idx) => idx !== i));

  async function submit() {
    setBusy(true);
    try {
      const body = { title: f.title || null, entryDate: f.entryDate || null, note: f.note || null, images };
      if (isEdit) await api.put(`/admin/construction/entries/${entry.id}`, body);
      else await api.post(`/admin/construction/steps/${step.id}/entries`, body);
      toast.success(isEdit ? 'Entry updated' : 'Entry added');
      onSaved && onSaved();
      onClose();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  return (
    <FormModal open={open} wide title={isEdit ? 'Edit entry' : `Add entry · ${step?.name || ''}`} onClose={onClose} onSubmit={submit} submitting={busy} submitLabel={isEdit ? 'Save' : 'Add entry'}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Title"><input className={inputClass} value={f.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Slab casting" /></Field>
        <Field label="Date"><input type="date" className={inputClass} value={f.entryDate} onChange={e => set('entryDate', e.target.value)} /></Field>
      </div>
      <Field label="Note"><textarea rows={2} className={inputClass} value={f.note} onChange={e => set('note', e.target.value)} /></Field>

      <div>
        <span className="block text-sm font-medium text-slate-700 mb-2">Photos ({images.length})</span>
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-3">
            {images.map((im, i) => (
              <div key={i} className="border border-slate-200 rounded-lg p-2">
                <div className="relative">
                  <img src={im.url} alt="" className="w-full h-24 object-cover rounded" />
                  <button type="button" onClick={() => removeImage(i)} className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full w-6 h-6 text-xs">✕</button>
                </div>
                <input className={`${inputClass} mt-2 text-xs`} value={im.caption} onChange={e => setCaption(i, e.target.value)} placeholder="Caption" />
              </div>
            ))}
          </div>
        )}
        <ImageUploader value="" onChange={addImage} label="Add a photo" />
      </div>
    </FormModal>
  );
}

// -------- Weekly update --------
export function UpdateModal({ open, propertyId, onClose, onSaved }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ title: '', description: '', mediaUrl: '', mediaType: 'image' });

  useEffect(() => { if (open) setF({ title: '', description: '', mediaUrl: '', mediaType: 'image' }); }, [open]);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  async function submit() {
    if (!f.title.trim()) { toast.error('Title is required'); return; }
    setBusy(true);
    try {
      await api.post(`/admin/construction/property/${propertyId}/updates`, {
        title: f.title.trim(), description: f.description || null,
        mediaUrl: f.mediaUrl || null, mediaType: f.mediaType,
      });
      toast.success('Update posted (resident notified)');
      onSaved && onSaved();
      onClose();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  return (
    <FormModal open={open} title="Post weekly update" onClose={onClose} onSubmit={submit} submitting={busy} submitLabel="Post update">
      <Field label="Title" required>
        <input className={inputClass} value={f.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Week 12 — Plastering started" />
      </Field>
      <Field label="Description"><textarea rows={3} className={inputClass} value={f.description} onChange={e => set('description', e.target.value)} /></Field>
      <Field label="Media type">
        <select className={inputClass} value={f.mediaType} onChange={e => set('mediaType', e.target.value)}>
          <option value="image">Image</option>
          <option value="video">Video link</option>
        </select>
      </Field>
      {f.mediaType === 'image' ? (
        <ImageUploader value={f.mediaUrl} onChange={v => set('mediaUrl', v)} label="Photo" />
      ) : (
        <Field label="Video URL"><input className={inputClass} value={f.mediaUrl} onChange={e => set('mediaUrl', e.target.value)} placeholder="https://…" /></Field>
      )}
    </FormModal>
  );
}
