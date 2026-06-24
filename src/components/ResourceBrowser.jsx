import React, { useEffect, useState, useCallback } from 'react';
import agentApi, { apiError } from '../lib/agentApi';
import { useToast } from './Toast';
import SearchBar from './SearchBar';

const ICON = { pdf: '📕', image: '🖼️', video: '🎬', doc: '📄', link: '🔗' };

// Agent read-only browser for agent_resources of a given `kind`.
export default function ResourceBrowser({ kind, heading, sub }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { kind };
      if (search) params.search = search;
      const { data } = await agentApi.get('/agent/resources', { params });
      setRows(data.data);
    } catch (e) { toast.error(apiError(e, 'Could not load')); } finally { setLoading(false); }
  }, [kind, search, toast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-1">{heading}</h2>
      <p className="text-sm text-slate-500 mb-4">{sub}</p>
      <div className="mb-4"><SearchBar value={search} onChange={setSearch} placeholder="Search…" /></div>

      {loading ? <div className="text-slate-400">Loading…</div>
        : rows.length === 0 ? <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">Nothing available yet.</div>
        : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map(r => (
              <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="block bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition">
                {r.thumbnailUrl ? <img src={r.thumbnailUrl} alt="" className="w-full h-36 object-cover" /> : <div className="w-full h-36 bg-slate-100 grid place-items-center text-4xl">{ICON[r.fileType] || '📄'}</div>}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800">{r.title}</h3>
                    <span className="text-lg">{ICON[r.fileType] || '📄'}</span>
                  </div>
                  {r.category && <p className="text-xs text-slate-400 mt-0.5">{r.category}</p>}
                  {r.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{r.description}</p>}
                  <span className="inline-block mt-3 text-brand-primary text-sm font-semibold">Open / download →</span>
                </div>
              </a>
            ))}
          </div>
        )}
    </div>
  );
}
