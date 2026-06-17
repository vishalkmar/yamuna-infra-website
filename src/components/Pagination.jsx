import React from 'react';

// Simple pager. Hidden when everything fits on one page.
export default function Pagination({ page = 1, pageSize = 20, total = 0, onPage }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
      <span>{from}–{to} of {total}</span>
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-50"
        >Prev</button>
        <span className="px-2">Page {page} / {pages}</span>
        <button
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-50"
        >Next</button>
      </div>
    </div>
  );
}
