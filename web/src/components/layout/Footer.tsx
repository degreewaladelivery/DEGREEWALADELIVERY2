import { Link } from 'react-router-dom';
import './Footer.css';

const LINKS = ['About', 'Help', 'Track Order', 'Contact', 'Terms & Privacy'];

/** Clean, centered site footer: brand, one compact link row, copyright. */
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
            <a key={l} href="#">{l}</a>
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
