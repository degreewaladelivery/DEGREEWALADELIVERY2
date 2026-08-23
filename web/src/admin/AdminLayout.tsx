import { Outlet, Link, NavLink } from 'react-router-dom';
import { useAdminAuth } from './AdminAuthContext';
import './admin.css';

export function AdminLayout() {
  const { signOut } = useAdminAuth();

  return (
    <div className="admin-app">
      <header className="admin-header">
        <Link to="/admin/categories" className="admin-header__brand">
          🛵 Degree<span className="admin-login__accent">wala</span> Admin
        </Link>
        <nav className="admin-header__nav">
          <NavLink
            to="/admin/categories"
            className={({ isActive }) => 'admin-header__link' + (isActive ? ' is-active' : '')}
          >
            Categories
          </NavLink>
          <NavLink
            to="/admin/shops"
            className={({ isActive }) => 'admin-header__link' + (isActive ? ' is-active' : '')}
          >
            Shops
          </NavLink>
          <NavLink
            to="/admin/agents"
            className={({ isActive }) => 'admin-header__link' + (isActive ? ' is-active' : '')}
          >
            Agents
          </NavLink>
          <NavLink
            to="/admin/customers"
            className={({ isActive }) => 'admin-header__link' + (isActive ? ' is-active' : '')}
          >
            Customers
          </NavLink>
          <NavLink
            to="/admin/attention"
            className={({ isActive }) => 'admin-header__link' + (isActive ? ' is-active' : '')}
          >
            Needs Attention
          </NavLink>
          <NavLink
            to="/admin/settings"
            className={({ isActive }) => 'admin-header__link' + (isActive ? ' is-active' : '')}
          >
            Settings
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
