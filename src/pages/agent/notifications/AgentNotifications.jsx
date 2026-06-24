import React, { useEffect, useState, useCallback } from 'react';
import agentApi, { apiError } from '../../../lib/agentApi';
import { useToast } from '../../../components/Toast';
import { fmtDateTime } from '../../../lib/format';

export default function AgentNotifications() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await agentApi.get('/agent/notifications'); setRows(data.data); }
    catch (e) { toast.error(apiError(e, 'Could not load notifications')); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function markRead(n) {
    if (n.isRead) return;
    try { await agentApi.post(`/agent/notifications/${n.id}/read`); load(); } catch (e) { toast.error(apiError(e)); }
  }
  async function markAll() {
    try { await agentApi.post('/agent/notifications/read-all'); toast.success('All marked read'); load(); } catch (e) { toast.error(apiError(e)); }
  }

  const unread = rows.filter(r => !r.isRead).length;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <div><h2 className="text-lg font-bold text-slate-800">Notifications</h2><p className="text-sm text-slate-500">{unread} unread</p></div>
        {unread > 0 && <button onClick={markAll} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50">Mark all read</button>}
      </div>

      {loading ? <div className="text-slate-400">Loading…</div>
        : rows.length === 0 ? <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">No notifications.</div>
        : (
          <div className="space-y-2">
            {rows.map(n => (
              <button key={n.id} onClick={() => markRead(n)} className={`block w-full text-left rounded-xl border p-4 transition ${n.isRead ? 'bg-white border-slate-200' : 'bg-brand-primary/5 border-brand-primary/30'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{n.title}</span>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-brand-primary" />}
                </div>
                {n.body && <p className="text-sm text-slate-600 mt-0.5">{n.body}</p>}
                <div className="text-xs text-slate-400 mt-1">{fmtDateTime(n.createdAt)}</div>
              </button>
            ))}
          </div>
        )}
    </div>
  );
}
