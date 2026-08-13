import { Link } from 'react-router-dom';
import './Footer.css';

const LINKS = [
  { label: 'Help', to: '/help' },
  { label: 'Track Order', to: '/track' },
  { label: 'Contact', to: '/help#contact' },
  { label: 'Terms & Privacy', to: '/terms' },
];

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <Link to="/" className="footer-brand">
          <span className="footer-brand__mark">🛵</span>
          <span className="footer-brand__text">
            Degree<span className="footer-brand__accent">wala</span>
          </span>
        </Link>
        <p className="site-footer__tag">We Deliver Your Trust</p>

        <nav className="site-footer__links">
          {LINKS.map((l) => (
            <Link key={l.label} to={l.to}>{l.label}</Link>
          ))}
        </nav>
      </div>

      <div className="site-footer__bar">
        <div className="container">
          © {new Date().getFullYear()} Degreewala Delivery
        </div>
      </div>
    </footer>
  );
}
