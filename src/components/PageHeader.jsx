import React from 'react';

// Page title + optional subtitle + a primary action (e.g. "+ Add").
export default function PageHeader({ title, subtitle, actionLabel, onAction, children }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        {subtitle && <p className="text-slate-500 text-sm mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {children}
        {actionLabel && (
          <button
            onClick={onAction}
            className="bg-brand-primary text-white text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
