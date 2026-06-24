import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAgentAuth } from '../context/AgentAuthContext';

// Gate for the agent area. Shows a loader while validating the token, then
// renders children or redirects to /agent/login (remembering the target).
export default function AgentProtected({ children }) {
  const { agent, loading } = useAgentAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-slate-400">Loading…</div>;
  }
  if (!agent) {
    return <Navigate to="/agent/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}
