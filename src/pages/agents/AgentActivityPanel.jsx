import React, { useEffect, useState } from 'react';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { fmtDateTime } from '../../lib/format';

// Admin view of an agent's activity trail (Module 1.9).
export default function AgentActivityPanel({ agentId }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const { data } = await api.get(`/admin/agents/${agentId}/activity`); setRows(data.data); }
      catch (e) { toast.error(apiError(e, 'Could not load activity')); } finally { setLoading(false); }
    })();
  }, [agentId, toast]);

  const label = a => a.action === 'LOGIN' ? 'Logged in' : `${a.action} ${a.entity || ''}${a.entityId ? ' #' + a.entityId : ''}`;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h4 className="font-semibold text-slate-700 mb-3">Activity</h4>
      {loading ? <p className="text-slate-400 text-sm">Loading…</p>
        : rows.length === 0 ? <p className="text-slate-400 text-sm">No activity recorded yet.</p>
        : (
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {rows.map(a => (
              <div key={a.id} className="flex items-center justify-between text-sm border-b border-slate-50 pb-1.5">
                <span className="text-slate-700">{label(a)}</span>
                <span className="text-xs text-slate-400">{fmtDateTime(a.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
