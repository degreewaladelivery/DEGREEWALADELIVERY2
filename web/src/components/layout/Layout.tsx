import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { BottomNav } from './BottomNav';

/**
 * The page frame shared by every route: Header on top, the active page in the
 * middle (<Outlet/> is where react-router slots the matched page), Footer below.
 *
 * The home route gets an extra class so mobile CSS can swap the regular site
 * header for the app-style (Zomato-like) top bar that lives inside Home.
 */
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
      {/* Scrolls back to top when navigating between pages. */}
      <ScrollRestoration />
    </div>
  );
}
