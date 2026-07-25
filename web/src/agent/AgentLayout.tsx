import { Outlet, Link } from 'react-router-dom';
import { useAgentAuth } from './AgentAuthContext';
import '../admin/admin.css';

export function AgentLayout() {
  const { signOut } = useAgentAuth();

  return (
    <div className="admin-app">
      <header className="admin-header">
        <Link to="/agent/orders" className="admin-header__brand">
          🛵 Degree<span className="admin-login__accent">wala</span> Delivery
        </Link>
        <button className="admin-btn admin-btn--ghost" onClick={() => signOut()}>
          Sign out
        </button>
      </header>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
