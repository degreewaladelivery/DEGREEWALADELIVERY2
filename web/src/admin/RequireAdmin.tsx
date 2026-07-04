import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from './AdminAuthContext';

/** Gates admin routes: redirects to /admin/login unless signed in AND an admin. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, isAdmin } = useAdminAuth();

  // Still checking the initial session.
  if (session === undefined) {
    return <div className="admin-loading">Loading…</div>;
  }

  if (!session || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}
