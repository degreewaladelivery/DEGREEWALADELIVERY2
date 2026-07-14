import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { BottomNav } from './BottomNav';

export function Layout() {
  const { pathname } = useLocation();

  return (
    <div className={'app-shell' + (pathname === '/' ? ' app-shell--home' : '')}>
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
      <BottomNav />

      <ScrollRestoration />
    </div>
  );
}
