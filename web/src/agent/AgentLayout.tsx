import { Outlet, Link, NavLink } from 'react-router-dom';
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
        <nav className="admin-header__nav">
          <NavLink
            to="/agent/orders"
            className={({ isActive }) => 'admin-header__link' + (isActive ? ' is-active' : '')}
          >
            Deliveries
          </NavLink>
          <NavLink
            to="/agent/profile"
            className={({ isActive }) => 'admin-header__link' + (isActive ? ' is-active' : '')}
          >
            My profile
          </NavLink>
        </nav>
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
