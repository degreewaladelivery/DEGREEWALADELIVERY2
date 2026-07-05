import { Outlet, Link } from 'react-router-dom';
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
