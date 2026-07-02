import { Outlet, ScrollRestoration } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { BottomNav } from './BottomNav';

/**
 * The page frame shared by every route: Header on top, the active page in the
 * middle (<Outlet/> is where react-router slots the matched page), Footer below.
 */
export function Layout() {
  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
      <BottomNav />
      {/* Scrolls back to top when navigating between pages. */}
      <ScrollRestoration />
    </>
  );
}
