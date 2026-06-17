import React from 'react';

// Confirmation modal for destructive / important actions.
export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
        {message && <p className="text-slate-600 text-sm mt-2">{message}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50 disabled:opacity-50"
          >{cancelLabel}</button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 ${danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-brand-primary hover:opacity-90'}`}
          >{busy ? 'Working…' : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
