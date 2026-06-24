import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import agentApi, { apiError } from '../../../lib/agentApi';
import { useToast } from '../../../components/Toast';
import PipelineBoard from '../../../components/PipelineBoard';
import LeadHistoryModal from '../../../components/LeadHistoryModal';

export default function AgentPipeline() {
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
      const { data } = await agentApi.get('/agent/leads');
      setLeads(data.data);
    } catch (e) { toast.error(apiError(e, 'Could not load pipeline')); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function move(lead, stage) {
    if (lead.stage === stage) return;
    try { await agentApi.post(`/agent/leads/${lead.id}/stage`, { stage }); toast.success('Moved'); load(); }
    catch (e) { toast.error(apiError(e)); }
  }

  async function openHistory(lead) {
    setHistLead(lead); setHistOpen(true); setHistLoading(true); setHistEntries([]);
    try { const { data } = await agentApi.get(`/agent/leads/${lead.id}/history`); setHistEntries(data.data); }
    catch (e) { toast.error(apiError(e)); } finally { setHistLoading(false); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div><h2 className="text-lg font-bold text-slate-800">Pipeline</h2><p className="text-sm text-slate-500">Move your leads through the funnel</p></div>
        <button onClick={() => navigate('/agent/leads')} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50">List view</button>
      </div>

      <PipelineBoard leads={leads} loading={loading} onMove={move} onOpenHistory={openHistory} />

      <LeadHistoryModal open={histOpen} title={histLead ? `Timeline — ${histLead.name}` : 'Timeline'} entries={histEntries} loading={histLoading} onClose={() => setHistOpen(false)} />
    </div>
  );
}
