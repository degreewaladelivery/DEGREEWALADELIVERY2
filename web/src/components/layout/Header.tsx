import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useCartStore, selectCount } from '../../store/cartStore';
import { useLocationStore } from '../../store/locationStore';
import { LocationModal } from '../ui/LocationModal';
import { CartIcon, MapPinIcon, MenuIcon, XIcon } from '../ui/icons';
import './Header.css';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Categories', to: '/#categories' },
  { label: 'Offers', to: '/#offers' },
  { label: 'Track Order', to: '/track' },
  { label: 'Help', to: '/help' },
];

export function Header() {
  const count = useCartStore((s) => selectCount(s.items));
  const location = useLocationStore((s) => s.location);
  const [menuOpen, setMenuOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="container site-header__inner">

        <button
          className="nav-toggle"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <XIcon size={22} /> : <MenuIcon size={22} />}
        </button>

        <Link to="/" className="brand" aria-label="Degreewala Delivery home" onClick={() => setMenuOpen(false)}>
          <span className="brand__mark">🛵</span>
          <span className="brand__col">
            <span className="brand__text">
              Degree<span className="brand__accent">wala</span>
            </span>
            <span className="brand__tag">We Deliver Your Trust</span>
          </span>
        </Link>

        <nav className="site-nav">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.label}
              to={link.to}
              className={({ isActive }) =>
                'site-nav__link' + (isActive && link.to === '/' ? ' is-active' : '')
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="site-header__right">
          <button className="location-pill" type="button" onClick={() => setLocationOpen(true)}>
            <span className="location-pill__icon"><MapPinIcon size={18} /></span>
            <span className="location-pill__col">
              <small>{location ? 'Delivering to' : 'Set your location'}</small>
              <strong>{location ? `${location.label} ▾` : 'Choose ▾'}</strong>
            </span>
          </button>

          <Link to="/cart" className="cart-btn" aria-label={`Cart, ${count} items`}>
            <span className="cart-btn__icon"><CartIcon size={22} /></span>
            {count > 0 && <span className="cart-btn__badge">{count}</span>}
          </Link>
        </div>
      </div>

      <div className={'mobile-menu' + (menuOpen ? ' is-open' : '')}>
        <div className="container">
          <button
            className="mobile-menu__location"
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setLocationOpen(true);
            }}
          >
            <span className="location-pill__icon"><MapPinIcon size={16} /></span>
            {location ? (
              <>Deliver to <strong>{location.label}</strong> · Change</>
            ) : (
              <strong>Set your delivery location</strong>
            )}
          </button>
          <nav className="mobile-menu__nav">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.label}
                to={link.to}
                className="mobile-menu__link"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {locationOpen && <LocationModal onClose={() => setLocationOpen(false)} />}
    </header>
  );
}
