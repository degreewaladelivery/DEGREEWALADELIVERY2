import { Link } from 'react-router-dom';
import './Footer.css';

const COLUMNS = [
  {
    title: 'Company',
    links: ['About Us', 'Careers', 'Partner With Us', 'Blog'],
  },
  {
    title: 'Categories',
    links: ['Food', 'Grocery', 'Medicine', 'Bakery', 'Meat'],
  },
  {
    title: 'Support',
    links: ['Help Center', 'Track Order', 'Contact Us', 'Terms & Privacy'],
  },
];

/** Site footer: brand, link columns, app badges and copyright. */
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        {/* Brand column */}
        <div className="site-footer__brand">
          <Link to="/" className="footer-brand">
            <span className="footer-brand__mark">🛵</span>
            <span className="footer-brand__text">
              Degree<span className="footer-brand__accent">wala</span>
            </span>
          </Link>
          <p className="site-footer__tag">
            We Deliver Your Trust — food, grocery, medicine, bakery and more
            from your favourite local shops.
          </p>
        </div>

        {/* Link columns */}
        {COLUMNS.map((col) => (
          <div key={col.title} className="site-footer__col">
            <h4>{col.title}</h4>
            <ul>
              {col.links.map((l) => (
                <li key={l}>
                  <a href="#">{l}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* App download column */}
        <div className="site-footer__col">
          <h4>Get the App</h4>
          <div className="site-footer__apps">
            <span className="store-badge">▶ Google Play</span>
            <span className="store-badge"> App Store</span>
          </div>
        </div>
      </div>

      <div className="site-footer__bar">
        <div className="container site-footer__bar-inner">
          <span>© {new Date().getFullYear()} Degreewala Delivery. All rights reserved.</span>
          <span>Made with 🧡 for your town</span>
        </div>
      </div>
    </footer>
  );
}
