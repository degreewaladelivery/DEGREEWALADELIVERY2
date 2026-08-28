import { Link } from 'react-router-dom';
import './Static.css';

export function Terms() {
  return (
    <div className="container static-page">
      <h1 className="static-page__heading">Terms &amp; Privacy</h1>
      <p className="static-page__lead">
        How DegreeWala Delivery works, and what we do with your information.
      </p>

      <section className="static-card">
        <h2 className="static-card__title">Who we are</h2>
        <p>
          DegreeWala Delivery is a local delivery service operating in and around Narasimharajapura,
          Chikkamagaluru, Karnataka. You can reach us on{' '}
          <a href="tel:+918431109368" className="static-link">+91 84311 09368</a>.
        </p>
      </section>

      <h2 className="static-page__subheading">Using the service</h2>

      <section className="static-card">
        <h3 className="static-card__sub">Orders and pricing</h3>
        <p>
          Prices shown are set by the shop. The delivery fee is calculated from the road distance
          between the pickup point and your delivery address, and is shown in full before you place
          the order. The amount charged is always recalculated on our servers at the moment you
          order, so what you are asked to pay matches what is actually delivered.
        </p>
      </section>

      <section className="static-card">
        <h3 className="static-card__sub">Delivery area</h3>
        <p>
          We deliver within 15 km of the pickup point. Orders outside that range cannot be placed.
          Delivery times are estimates and can be affected by weather, traffic and shop preparation
          time.
        </p>
      </section>

      <section className="static-card">
        <h3 className="static-card__sub">Payment</h3>
        <p>
          Cash on Delivery is currently the only payment method. You pay the delivery agent directly
          when your order arrives.
        </p>
      </section>

      <section className="static-card">
        <h3 className="static-card__sub">Cancellations</h3>
        <p>
          To change or cancel an order, please call us. If an order cannot be fulfilled — for example
          an item is out of stock — we will contact you on the number you signed in with.
        </p>
      </section>

      <h2 className="static-page__subheading">Your information</h2>

      <section className="static-card">
        <p>
          In short, below. The full detail — including every company that receives any of it — is in
          our <Link to="/privacy" className="static-link">Privacy Policy</Link>.
        </p>
      </section>

      <section className="static-card">
        <h3 className="static-card__sub">What we collect</h3>
        <p>
          Your phone number, the delivery address and map location you give us, and the details of
          the orders you place. We do not ask for or store card or bank details.
        </p>
      </section>

      <section className="static-card">
        <h3 className="static-card__sub">Why we collect it</h3>
        <p>
          Your phone number identifies your account and lets the delivery agent contact you. Your
          location is used to calculate the delivery fee and to guide the agent to your door. Order
          details let you track and review what you have ordered.
        </p>
      </section>

      <section className="static-card">
        <h3 className="static-card__sub">Who can see it</h3>
        <p>
          The delivery agent assigned to your order sees your name, phone number and delivery
          address, so they can complete the delivery. While a delivery is in progress, you can see
          the agent's location on the map — and they can see yours. Nobody else can read your orders.
        </p>
      </section>

      <section className="static-card">
        <h3 className="static-card__sub">Verification messages</h3>
        <p>
          When you sign in, a one-time code is sent to your phone through a third-party messaging
          provider. That provider processes your number solely to deliver the code.
        </p>
      </section>

      <section className="static-card">
        <h3 className="static-card__sub">Removing your data</h3>
        <p>
          Call us and we will delete your account and order history. Some order records may be
          retained where we are required to keep them.
        </p>
      </section>

      <p className="static-page__note">
        These terms may change as the service grows. The current version always appears on this page.
      </p>
    </div>
  );
}
