import React, { useState } from 'react';
import { Field, inputClass } from './FormModal';
import ImageUploader from './ImageUploader';
import { fmtDate } from '../lib/format';

const DOC_TYPES = [
  { value: 'agreement', label: 'Agreement' },
  { value: 'docket', label: 'Booking docket' },
  { value: 'cost_sheet', label: 'Cost sheet' },
  { value: 'payment_receipt', label: 'Payment receipt' },
  { value: 'kyc', label: 'Buyer KYC' },
  { value: 'other', label: 'Other' },
];
const typeLabel = v => (DOC_TYPES.find(t => t.value === v) || {}).label || v;

// Booking documents drawer (Module 3.5). Parent supplies docs + handlers.
export default function BookingDocsModal({ open, title = 'Booking documents', docs, loading, onClose, onAdd, onDelete }) {
  const [form, setForm] = useState({ docType: 'agreement', label: '', url: '' });
  if (!open) return null;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function submit() {
    if (!form.url) return;
    onAdd({ docType: form.docType, label: form.label || null, url: form.url });
    setForm({ docType: 'agreement', label: '', url: '' });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="bg-white h-full w-full max-w-md flex flex-col shadow-xl animate-[slideIn_.18s_ease]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg">✕</button>
        </div>

        <div className="p-5 border-b border-slate-100 space-y-2">
          <Field label="Type"><select className={inputClass} value={form.docType} onChange={e => set('docType', e.target.value)}>{DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
          <Field label="Label"><input className={inputClass} value={form.label} onChange={e => set('label', e.target.value)} /></Field>
          <Field label="File / image"><ImageUploader value={form.url} onChange={url => set('url', url)} label="Booking document" /></Field>
          <button onClick={submit} className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90">Add document</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {loading ? <p className="text-slate-400 text-sm">Loading…</p>
            : !docs || docs.length === 0 ? <p className="text-slate-400 text-sm">No documents yet.</p>
            : docs.map(d => (
              <div key={d.id} className="flex items-center gap-3 border border-slate-100 rounded-lg p-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{typeLabel(d.docType)}{d.label ? ` — ${d.label}` : ''}</div>
                  <div className="text-xs text-slate-400">{fmtDate(d.createdAt)} · {d.byName || d.byType}</div>
                </div>
                <a href={d.url} target="_blank" rel="noreferrer" className="text-brand-primary text-sm font-semibold hover:underline shrink-0">View</a>
                <button onClick={() => onDelete(d)} className="text-rose-600 text-xs font-semibold hover:underline shrink-0">Delete</button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
