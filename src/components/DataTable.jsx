import React from 'react';

// Generic table.
//   columns: [{ key, header, render?(row), className?, align? }]
//   rows:    array of objects
//   rowKey:  string field name or (row)=>key  (default 'id')
//   actions: optional (row) => ReactNode  rendered in a trailing column
export default function DataTable({ columns, rows, loading, empty = 'No records', rowKey = 'id', actions }) {
  const keyOf = (row, i) => (typeof rowKey === 'function' ? rowKey(row) : row[rowKey] ?? i);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-left">
              {columns.map(c => (
                <th key={c.key} className={`px-4 py-3 font-semibold ${c.align === 'right' ? 'text-right' : ''}`}>
                  {c.header}
                </th>
              ))}
              {actions && <th className="px-4 py-3 font-semibold text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-10 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-10 text-center text-slate-400">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={keyOf(row, i)} className="hover:bg-slate-50/70">
                  {columns.map(c => (
                    <td key={c.key} className={`px-4 py-3 text-slate-700 ${c.align === 'right' ? 'text-right' : ''} ${c.className || ''}`}>
                      {c.render ? c.render(row) : row[c.key] ?? '—'}
                    </td>
                  ))}
                  {actions && <td className="px-4 py-3 text-right whitespace-nowrap">{actions(row)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
