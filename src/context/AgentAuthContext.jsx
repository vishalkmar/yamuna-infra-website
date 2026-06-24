import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import agentApi from '../lib/agentApi';

// Holds the logged-in agent + login/logout. Mirrors AuthContext (admin) but for
// the agent auth domain (own token + /agent/auth/* endpoints). On mount, if a
// token exists it validates via /agent/auth/me so a refresh keeps the session.
const AgentAuthContext = createContext(null);

export function AgentAuthProvider({ children }) {
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const token = localStorage.getItem('agent_token');
    if (!token) { setAgent(null); setLoading(false); return; }
    try {
      const { data } = await agentApi.get('/agent/auth/me');
      setAgent(data.data);
    } catch {
      localStorage.removeItem('agent_token');
      setAgent(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  useEffect(() => {
    const onUnauth = () => setAgent(null);
    window.addEventListener('agent-unauthorized', onUnauth);
    return () => window.removeEventListener('agent-unauthorized', onUnauth);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await agentApi.post('/agent/auth/login', { email, password });
    localStorage.setItem('agent_token', data.data.token);
    // login returns a slim agent; pull the full profile for the layout/menu.
    await loadMe();
    return data.data.agent;
  }, [loadMe]);

  const logout = useCallback(() => {
    localStorage.removeItem('agent_token');
    setAgent(null);
  }, []);

  return (
    <AgentAuthContext.Provider value={{ agent, loading, login, logout, refresh: loadMe }}>
      {children}
    </AgentAuthContext.Provider>
  );
}

export function useAgentAuth() {
  const ctx = useContext(AgentAuthContext);
  if (!ctx) throw new Error('useAgentAuth must be used within <AgentAuthProvider>');
  return ctx;
}
