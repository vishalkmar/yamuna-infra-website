import React from 'react';

// Right-side slide-over form panel. Parent owns the form state and renders
// fields as children; this wraps header / scroll body / footer + submit.
//   <FormModal open title onClose onSubmit submitting>
//     <Field label="Name"><input .../></Field>
//   </FormModal>
export default function FormModal({
  open,
  title,
  onClose,
  onSubmit,
  submitting = false,
  submitLabel = 'Save',
  wide = false,
  children,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <form
        onClick={e => e.stopPropagation()}
        onSubmit={e => { e.preventDefault(); onSubmit && onSubmit(); }}
        className={`bg-white h-full w-full ${wide ? 'max-w-2xl' : 'max-w-md'} flex flex-col shadow-xl animate-[slideIn_.18s_ease]`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">{children}</div>
        <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >{submitting ? 'Saving…' : submitLabel}</button>
        </div>
      </form>
    </div>
  );
}

// Labelled field wrapper for consistent form layout.
export function Field({ label, hint, required, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">
        {label}{required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-slate-400 mt-1">{hint}</span>}
    </label>
  );
}

// Shared input class so module forms look consistent.
export const inputClass =
  'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary';
