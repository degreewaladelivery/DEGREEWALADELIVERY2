import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from './AdminAuthContext';

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, isAdmin } = useAdminAuth();

  if (session === undefined) {
    return <div className="admin-loading">Loading…</div>;
  }

  if (!session || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}
