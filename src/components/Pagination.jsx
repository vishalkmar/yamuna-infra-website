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

// Every admin table shows at most this many rows per page.
export const MAX_ROWS = 50;

// Client-side paging for a list: const pg = usePaged(rows); pg.rows / <PageBar {...pg} />
export function usePaged(rows, pageSize = MAX_ROWS) {
  const size = Math.min(pageSize || MAX_ROWS, MAX_ROWS);
  const [page, setPage] = React.useState(1);
  const total = (rows || []).length;
  const pages = Math.max(1, Math.ceil(total / size));
  const cur = Math.min(page, pages);
  React.useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  return { rows: (rows || []).slice((cur - 1) * size, cur * size), page: cur, pages, total, size, setPage };
}

export function PageBar({ page, pages, total, size, setPage }) {
  if (!total) return null;
  return (
    <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 text-xs text-slate-500 bg-white">
      <span>{(page - 1) * size + 1}–{Math.min(page * size, total)} of {total}</span>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          <button type="button" disabled={page <= 1} onClick={() => setPage(1)} className="px-2 py-1 rounded border border-slate-300 disabled:opacity-40">«</button>
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-2 py-1 rounded border border-slate-300 disabled:opacity-40">Prev</button>
          <span className="px-1">Page {page} / {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="px-2 py-1 rounded border border-slate-300 disabled:opacity-40">Next</button>
          <button type="button" disabled={page >= pages} onClick={() => setPage(pages)} className="px-2 py-1 rounded border border-slate-300 disabled:opacity-40">»</button>
        </div>
      )}
    </div>
  );
}
