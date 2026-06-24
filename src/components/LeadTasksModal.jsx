import React, { useState } from 'react';
import { Field, inputClass } from './FormModal';
import { fmtDateTime } from '../lib/format';

function isOverdue(t) {
  return !t.isDone && t.dueAt && new Date(t.dueAt) < new Date();
}

// Per-lead follow-up tasks drawer. Parent supplies tasks + handlers (bound to
// admin `api` or agent `agentApi`).
//   onCreate({title,notes,dueAt}) · onToggle(task) · onDelete(task)
export default function LeadTasksModal({ open, title = 'Follow-ups', tasks, loading, busy, onClose, onCreate, onToggle, onDelete }) {
  const [form, setForm] = useState({ title: '', notes: '', dueAt: '' });
  if (!open) return null;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    onCreate({
      title: form.title,
      notes: form.notes || null,
      dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
    });
    setForm({ title: '', notes: '', dueAt: '' });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="bg-white h-full w-full max-w-md flex flex-col shadow-xl animate-[slideIn_.18s_ease]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg">✕</button>
        </div>

        <form onSubmit={submit} className="p-5 border-b border-slate-100 space-y-3">
          <Field label="New task" required><input className={inputClass} placeholder="Call back, send brochure…" value={form.title} onChange={e => set('title', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Due"><input type="datetime-local" className={inputClass} value={form.dueAt} onChange={e => set('dueAt', e.target.value)} /></Field>
            <Field label="Note"><input className={inputClass} value={form.notes} onChange={e => set('notes', e.target.value)} /></Field>
          </div>
          <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50">Add task</button>
        </form>

        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {loading ? <p className="text-slate-400 text-sm">Loading…</p>
            : !tasks || tasks.length === 0 ? <p className="text-slate-400 text-sm">No follow-ups yet.</p>
            : tasks.map(t => (
              <div key={t.id} className={`flex items-start gap-3 border rounded-lg p-3 ${isOverdue(t) ? 'border-rose-200 bg-rose-50' : 'border-slate-100'}`}>
                <input type="checkbox" checked={!!t.isDone} onChange={() => onToggle(t)} className="mt-1" />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${t.isDone ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}`}>{t.title}</div>
                  {t.notes && <div className="text-xs text-slate-500">{t.notes}</div>}
                  {t.dueAt && <div className={`text-xs ${isOverdue(t) ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>Due {fmtDateTime(t.dueAt)}{isOverdue(t) ? ' · overdue' : ''}</div>}
                </div>
                <button onClick={() => onDelete(t)} className="text-rose-600 text-xs font-semibold hover:underline shrink-0">Delete</button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
