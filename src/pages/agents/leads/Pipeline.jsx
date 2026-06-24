import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../../lib/api';
import { useToast } from '../../../components/Toast';
import PageHeader from '../../../components/PageHeader';
import PipelineBoard from '../../../components/PipelineBoard';
import LeadHistoryModal from '../../../components/LeadHistoryModal';

export default function Pipeline() {
  const navigate = useNavigate();
  const toast = useToast();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [histOpen, setHistOpen] = useState(false);
  const [histLoading, setHistLoading] = useState(false);
  const [histEntries, setHistEntries] = useState([]);
  const [histLead, setHistLead] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/leads', { params: { pageSize: 200 } });
      setLeads(data.data.rows);
    } catch (e) { toast.error(apiError(e, 'Could not load pipeline')); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function move(lead, stage) {
    if (lead.stage === stage) return;
    try { await api.post(`/admin/leads/${lead.id}/stage`, { stage }); toast.success('Moved'); load(); }
    catch (e) { toast.error(apiError(e)); }
  }

  async function openHistory(lead) {
    setHistLead(lead); setHistOpen(true); setHistLoading(true); setHistEntries([]);
    try { const { data } = await api.get(`/admin/leads/${lead.id}/history`); setHistEntries(data.data); }
    catch (e) { toast.error(apiError(e)); } finally { setHistLoading(false); }
  }

  return (
    <div>
      <PageHeader title="Pipeline" subtitle="Drag leads through the funnel">
        <button onClick={() => navigate('/agents/leads')} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50">List view</button>
      </PageHeader>

      <PipelineBoard leads={leads} loading={loading} showAgent onMove={move} onOpenHistory={openHistory} />

      <LeadHistoryModal open={histOpen} title={histLead ? `Timeline — ${histLead.name}` : 'Timeline'} entries={histEntries} loading={histLoading} onClose={() => setHistOpen(false)} />
    </div>
  );
}
