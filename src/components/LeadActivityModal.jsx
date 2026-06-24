import React, { useState } from 'react';
import { Field, inputClass } from './FormModal';
import ImageUploader from './ImageUploader';
import { fmtDateTime } from '../lib/format';

// Notes + documents drawer for a lead (Module 2.8). Parent supplies data +
// handlers bound to admin `api` or agent `agentApi`.
//   onAddNote(body) · onDeleteNote(note) · onAddDoc({label,url}) · onDeleteDoc(doc)
export default function LeadActivityModal({ open, title = 'Notes & files', notes, docs, loading, onClose, onAddNote, onDeleteNote, onAddDoc, onDeleteDoc }) {
  const [tab, setTab] = useState('notes');
  const [note, setNote] = useState('');
  const [docLabel, setDocLabel] = useState('');
  const [docUrl, setDocUrl] = useState('');
  if (!open) return null;

  function submitNote(e) {
    e.preventDefault();
    if (!note.trim()) return;
    onAddNote(note);
    setNote('');
  }
  function submitDoc() {
    if (!docUrl) return;
    onAddDoc({ label: docLabel || null, url: docUrl });
    setDocLabel(''); setDocUrl('');
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="bg-white h-full w-full max-w-md flex flex-col shadow-xl animate-[slideIn_.18s_ease]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg">✕</button>
        </div>

        <div className="flex border-b border-slate-200">
          {['notes', 'documents'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2.5 text-sm font-semibold capitalize ${tab === t ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-slate-500'}`}>{t}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'notes' ? (
            <>
              <form onSubmit={submitNote} className="mb-4">
                <textarea className={inputClass} rows={2} placeholder="Add a note (call summary, remark)…" value={note} onChange={e => setNote(e.target.value)} />
                <button type="submit" className="mt-2 px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90">Add note</button>
              </form>
              {loading ? <p className="text-slate-400 text-sm">Loading…</p>
                : !notes || notes.length === 0 ? <p className="text-slate-400 text-sm">No notes yet.</p>
                : (
                  <div className="space-y-2">
                    {notes.map(n => (
                      <div key={n.id} className="border border-slate-100 rounded-lg p-3">
                        <div className="text-sm text-slate-800 whitespace-pre-wrap">{n.body}</div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-slate-400">{fmtDateTime(n.createdAt)} · {n.byName || n.byType}</span>
                          <button onClick={() => onDeleteNote(n)} className="text-rose-600 text-xs font-semibold hover:underline">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </>
          ) : (
            <>
              <div className="mb-4 space-y-2">
                <Field label="Label"><input className={inputClass} placeholder="Buyer ID, cost sheet…" value={docLabel} onChange={e => setDocLabel(e.target.value)} /></Field>
                <Field label="File / image"><ImageUploader value={docUrl} onChange={setDocUrl} label="Lead document" /></Field>
                <button onClick={submitDoc} className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90">Add document</button>
              </div>
              {loading ? <p className="text-slate-400 text-sm">Loading…</p>
                : !docs || docs.length === 0 ? <p className="text-slate-400 text-sm">No documents yet.</p>
                : (
                  <div className="space-y-2">
                    {docs.map(d => (
                      <div key={d.id} className="flex items-center gap-3 border border-slate-100 rounded-lg p-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-800 truncate">{d.label || 'Document'}</div>
                          <div className="text-xs text-slate-400">{fmtDateTime(d.createdAt)} · {d.byName || d.byType}</div>
                        </div>
                        <a href={d.url} target="_blank" rel="noreferrer" className="text-brand-primary text-sm font-semibold hover:underline shrink-0">View</a>
                        <button onClick={() => onDeleteDoc(d)} className="text-rose-600 text-xs font-semibold hover:underline shrink-0">Delete</button>
                      </div>
                    ))}
                  </div>
                )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
