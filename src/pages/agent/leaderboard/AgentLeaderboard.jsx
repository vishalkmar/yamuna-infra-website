import React, { useCallback } from 'react';
import agentApi from '../../../lib/agentApi';
import { useAgentAuth } from '../../../context/AgentAuthContext';
import Leaderboard from '../../../components/Leaderboard';

export default function AgentLeaderboard() {
  const { agent } = useAgentAuth();
  const fetcher = useCallback(async (params) => {
    const { data } = await agentApi.get('/agent/leaderboard', { params });
    return data.data;
  }, []);
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-1">Leaderboard</h2>
      <p className="text-sm text-slate-500 mb-4">See where you rank among partners.</p>
      <Leaderboard fetcher={fetcher} highlightId={agent?.id} />
    </div>
  );
}
