import { Link, NavLink } from 'react-router-dom';
import { useCartStore, selectCount } from '../../store/cartStore';
import { getCustomer } from '../../lib/auth';
import { HomeIcon, TagIcon, CartIcon, UserIcon } from '../ui/icons';
import './BottomNav.css';

export function BottomNav() {
  const count = useCartStore((s) => selectCount(s.items));
  // Read per render rather than cached: NavLink re-renders this on every
  // navigation, so signing in or out updates where Account points without any
  // extra wiring.
  const accountPath = getCustomer() ? '/profile' : '/login';

  return (
    <nav className="bottom-nav" aria-label="Primary">
      <NavLink to="/" end className={({ isActive }) => 'bottom-nav__tab' + (isActive ? ' is-active' : '')}>
        <span className="bottom-nav__icon"><HomeIcon size={22} /></span>
        <span className="bottom-nav__label">Home</span>
      </NavLink>

      <Link to="/#offers" className="bottom-nav__tab">
        <span className="bottom-nav__icon"><TagIcon size={22} /></span>
        <span className="bottom-nav__label">Offers</span>
      </Link>

      <NavLink to="/cart" className={({ isActive }) => 'bottom-nav__tab' + (isActive ? ' is-active' : '')}>
        <span className="bottom-nav__icon">
          <CartIcon size={22} />
          {count > 0 && <span className="bottom-nav__badge">{count}</span>}
        </span>
        <span className="bottom-nav__label">Cart</span>
      </NavLink>

      <NavLink to={accountPath} className={({ isActive }) => 'bottom-nav__tab' + (isActive ? ' is-active' : '')}>
        <span className="bottom-nav__icon"><UserIcon size={22} /></span>
        <span className="bottom-nav__label">Account</span>
      </NavLink>
    </nav>
  );
}
