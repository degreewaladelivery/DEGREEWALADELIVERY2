import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAgentAuth } from './AgentAuthContext';

export function RequireAgent({ children }: { children: ReactNode }) {
  const { session, isAgent } = useAgentAuth();

  if (session === undefined) {
    return <div className="admin-loading">Loading…</div>;
  }

  if (!session || !isAgent) {
    return <Navigate to="/agent/login" replace />;
  }

  return <>{children}</>;
}
