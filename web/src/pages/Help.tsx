import { Link } from 'react-router-dom';
import { MAX_DELIVERY_RADIUS_KM } from '@shared/deliveryFare';
import './Static.css';

const FAQS = [
  {
    q: 'How is the delivery fee calculated?',
    a: `It is based on the road distance from the shop to your address — ₹29 covers the first kilometre, then ₹7 for each kilometre after that. You see the exact amount at checkout before you place the order.`,
  },
  {
    q: 'How far do you deliver?',
    a: `Up to ${MAX_DELIVERY_RADIUS_KM} km from the pickup point. If your address is further than that, checkout will tell you rather than letting you place an order we cannot fulfil.`,
  },
  {
    q: 'How do I pay?',
    a: 'Cash on Delivery for now — you pay the delivery agent when your order arrives. Online payment is coming soon.',
  },
  {
    q: 'Can I order from two shops at once?',
    a: 'Not in a single order, because each order is picked up from one place. If you add an item from a different shop we will ask before starting a new cart, so nothing disappears without warning.',
  },
  {
    q: 'Where is my order?',
    a: 'Open Track Order. Once an agent accepts, you can watch them move on the map, see how far away they are, and call them directly.',
  },
  {
    q: 'I need to change or cancel my order',
    a: 'Please call us on the number below. Cancelling from the app is not available yet.',
  },
  {
    q: 'Why did my OTP arrive as a phone call?',
    a: 'SMS delivery is still being set up with the telecom operators. Until that completes, your code is read out over an automated call instead.',
  },
];

export function Help() {
  return (
    <div className="container static-page">
      <h1 className="static-page__heading">Help Centre</h1>
      <p className="static-page__lead">
        Answers to the things people ask most. If yours is not here, call us — a real person picks up.
      </p>

      <section className="static-card" id="contact">
        <h2 className="static-card__title">Contact us</h2>
        <p className="static-page__lead" style={{ marginBottom: 12 }}>
          Balehonnuru, Narasimharajapura, Chikkamagaluru, Karnataka 577112
        </p>
        <a href="tel:+918431109368" className="btn btn-primary btn-md">📞 Call +91 84311 09368</a>
      </section>

      <h2 className="static-page__subheading">Frequently asked</h2>
      <div className="faq-list">
        {FAQS.map((item) => (
          <details key={item.q} className="faq">
            <summary className="faq__q">{item.q}</summary>
            <p className="faq__a">{item.a}</p>
          </details>
        ))}
      </div>

      <p className="static-page__lead" style={{ marginTop: 28 }}>
        Looking for an order? <Link to="/track" className="static-link">Track it here</Link>.
      </p>
    </div>
  );
}
