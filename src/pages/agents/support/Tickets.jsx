import React, { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../../../lib/api';
import { useToast } from '../../../components/Toast';
import PageHeader from '../../../components/PageHeader';
import DataTable from '../../../components/DataTable';
import Pagination from '../../../components/Pagination';
import StatCard from '../../../components/StatCard';
import StatusBadge from '../../../components/StatusBadge';
import TicketThread from '../../../components/TicketThread';
import { fmtDateTime } from '../../../lib/format';

const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
const FILTERS = [{ key: '', label: 'All' }, ...STATUSES.map(s => ({ key: s, label: s.replace('_', ' ') }))];

export default function Tickets() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, pageSize: 20 };
      if (status) params.status = status;
      const { data: res } = await api.get('/admin/agent-tickets', { params });
      setData(res.data);
    } catch (e) { toast.error(apiError(e, 'Could not load tickets')); } finally { setLoading(false); }
  }, [page, status, toast]);

  const loadStats = useCallback(async () => {
    try { const { data } = await api.get('/admin/agent-tickets/stats'); setStats(data.data); } catch { /* */ }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { setPage(1); }, [status]);

  const openThread = useCallback(async (t) => {
    setThread(t); setThreadLoading(true); setMessages([]);
    try { const { data } = await api.get(`/admin/agent-tickets/${t.id}`); setThread(data.data.ticket); setMessages(data.data.messages); }
    catch (e) { toast.error(apiError(e)); } finally { setThreadLoading(false); }
  }, [toast]);

  async function send(body) {
    try { await api.post(`/admin/agent-tickets/${thread.id}/reply`, { body }); openThread(thread); load(); }
    catch (e) { toast.error(apiError(e)); }
  }
  async function setTicketStatus(s) {
    try { await api.post(`/admin/agent-tickets/${thread.id}/status`, { status: s }); setThread(t => ({ ...t, status: s })); load(); loadStats(); }
    catch (e) { toast.error(apiError(e)); }
  }

  const columns = [
    { key: 'subject', header: 'Subject', render: r => <div><div className="font-medium text-slate-800">{r.subject}</div><div className="text-xs text-slate-400">{r.agentName} · {r.category || 'general'}</div></div> },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status === 'resolved' || r.status === 'closed' ? 'approved' : r.status === 'open' ? 'pending' : 'preparing'}>{r.status.replace('_', ' ')}</StatusBadge> },
    { key: 'lastMessageAt', header: 'Last activity', render: r => fmtDateTime(r.lastMessageAt) },
  ];

  return (
    <div>
      <PageHeader title="Agent Support" subtitle={`${data.total} ticket${data.total === 1 ? '' : 's'}`} />

      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <StatCard label="Total" value={stats.total} icon="🎫" />
          <StatCard label="Open" value={stats.open} icon="🟢" />
          <StatCard label="In progress" value={stats.inProgress} icon="🔧" />
        </div>
      )}

      <div className="flex flex-wrap gap-1 mb-4">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setStatus(f.key)} className={`px-3 py-1.5 rounded-lg text-sm border capitalize transition ${status === f.key ? 'bg-brand-primary text-white border-brand-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>{f.label}</button>
        ))}
      </div>

      <DataTable columns={columns} rows={data.rows} loading={loading} empty="No tickets yet."
        actions={r => <button onClick={() => openThread(r)} className="text-brand-primary font-semibold hover:underline">Open</button>} />
      <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />

      <TicketThread
        open={!!thread}
        ticket={thread}
        messages={messages}
        loading={threadLoading}
        onClose={() => setThread(null)}
        onSend={send}
        statusBar={
          <div className="flex flex-wrap gap-1">
            {STATUSES.map(s => (
              <button key={s} onClick={() => setTicketStatus(s)} className={`px-2 py-1 rounded text-xs border capitalize ${thread?.status === s ? 'bg-slate-700 text-white border-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>{s.replace('_', ' ')}</button>
            ))}
          </div>
        }
      />
    </div>
  );
}
