import React, { useEffect, useState, useCallback } from 'react';
import agentApi, { apiError } from '../../../lib/agentApi';
import { useToast } from '../../../components/Toast';
import { fmtDate } from '../../../lib/format';

export default function AgentNews() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await agentApi.get('/agent/announcements'); setRows(data.data); }
    catch (e) { toast.error(apiError(e, 'Could not load news')); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-3xl">
      <h2 className="text-lg font-bold text-slate-800 mb-1">News & Announcements</h2>
      <p className="text-sm text-slate-500 mb-4">Latest from Shri Yamuna Infra.</p>

      {loading ? <div className="text-slate-400">Loading…</div>
        : rows.length === 0 ? <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">No announcements yet.</div>
        : (
          <div className="space-y-4">
            {rows.map(a => (
              <div key={a.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {a.imageUrl && <img src={a.imageUrl} alt="" className="w-full max-h-56 object-cover" />}
                <div className="p-5">
                  <div className="flex items-center gap-2">
                    {a.isPinned && <span title="Pinned">📌</span>}
                    <h3 className="font-bold text-slate-800">{a.title}</h3>
                  </div>
                  {a.body && <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{a.body}</p>}
                  <div className="text-xs text-slate-400 mt-3">{fmtDate(a.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
