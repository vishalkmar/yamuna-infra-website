import React, { useEffect, useState, useCallback } from 'react';
import agentApi, { apiError } from '../../../lib/agentApi';
import { useToast } from '../../../components/Toast';
import { fmtDateTime } from '../../../lib/format';

const FILTERS = [
  { key: 'pending', label: 'Pending' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'done', label: 'Done' },
  { key: '', label: 'All' },
];
const isOverdue = t => !t.isDone && t.dueAt && new Date(t.dueAt) < new Date();

export default function AgentTasks() {
  const toast = useToast();
  const [filter, setFilter] = useState('pending');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await agentApi.get('/agent/tasks', { params: filter ? { status: filter } : {} });
      setRows(data.data);
    } catch (e) { toast.error(apiError(e, 'Could not load tasks')); } finally { setLoading(false); }
  }, [filter, toast]);

  useEffect(() => { load(); }, [load]);

  async function toggle(t) {
    try { await agentApi.post(`/agent/tasks/${t.id}/done`, { done: !t.isDone }); load(); }
    catch (e) { toast.error(apiError(e)); }
  }
  async function remove(t) {
    try { await agentApi.delete(`/agent/tasks/${t.id}`); toast.success('Removed'); load(); }
    catch (e) { toast.error(apiError(e)); }
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-lg font-bold text-slate-800 mb-1">Follow-ups</h2>
      <p className="text-sm text-slate-500 mb-4">Your tasks across all leads. Add tasks from a lead in My Leads.</p>

      <div className="flex flex-wrap gap-1 mb-4">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`px-3 py-1.5 rounded-lg text-sm border transition ${filter === f.key ? 'bg-brand-primary text-white border-brand-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>{f.label}</button>
        ))}
      </div>

      {loading ? <div className="text-slate-400">Loading…</div>
        : rows.length === 0 ? <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">No tasks.</div>
        : (
          <div className="space-y-2">
            {rows.map(t => (
              <div key={t.id} className={`flex items-start gap-3 bg-white border rounded-lg p-3 ${isOverdue(t) ? 'border-rose-200 bg-rose-50' : 'border-slate-200'}`}>
                <input type="checkbox" checked={!!t.isDone} onChange={() => toggle(t)} className="mt-1" />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${t.isDone ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}`}>{t.title}</div>
                  <div className="text-xs text-slate-500">{t.leadName}{t.leadPhone ? ` · ${t.leadPhone}` : ''}</div>
                  {t.notes && <div className="text-xs text-slate-500">{t.notes}</div>}
                  {t.dueAt && <div className={`text-xs ${isOverdue(t) ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>Due {fmtDateTime(t.dueAt)}{isOverdue(t) ? ' · overdue' : ''}</div>}
                </div>
                <button onClick={() => remove(t)} className="text-rose-600 text-xs font-semibold hover:underline shrink-0">Delete</button>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
