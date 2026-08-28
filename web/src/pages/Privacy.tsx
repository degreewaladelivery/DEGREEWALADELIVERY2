import { Link } from 'react-router-dom';
import './Static.css';

/**
 * The privacy policy, at a stable URL of its own.
 *
 * Google Play requires a policy reachable without signing in, and the short
 * section on the Terms page no longer described what the apps actually do — it
 * predates names, email addresses, push notifications and agent location
 * tracking, and named none of the companies that receive data.
 *
 * Everything here is written from what the code genuinely does. A policy that
 * overstates is a promise nobody kept; one that understates is the reason an
 * app gets pulled.
 */
export function Privacy() {
  return (
    <div className="container static-page">
      <h1 className="static-page__heading">Privacy Policy</h1>
      <p className="static-page__lead">
        What DegreeWala Delivery collects, why, and who else sees it. Last updated 27 August 2026.
      </p>

      <section className="static-card">
        <h2 className="static-card__title">Who we are</h2>
        <p>
          DegreeWala Delivery is a local delivery service operating in and around Balehonnur and
          Narasimharajapura, Chikkamagaluru, Karnataka. This policy covers our website at
          degreewaladelivery.com and our two Android apps — DegreeWala Delivery (for customers) and
          DegreeWala Partner (for delivery agents).
        </p>
        <p>
          For anything in this policy, call{' '}
          <a href="tel:+918431109368" className="static-link">+91 84311 09368</a>.
        </p>
      </section>

      <h2 className="static-page__subheading">What we collect from customers</h2>

      <section className="static-card">
        <h3 className="static-card__sub">Your account</h3>
        <p>
          Your <strong>phone number</strong>, which is how you sign in. Your <strong>name</strong>,
          which we ask for once so the delivery agent knows who to hand the order to. Your{' '}
          <strong>email address</strong> only if you choose to give one — it is optional, we do not
          send marketing to it, and nothing in the app emails you.
        </p>
      </section>

      <section className="static-card">
        <h3 className="static-card__sub">Your delivery location</h3>
        <p>
          The address you type and the point you place on the map, including its coordinates. We use
          these to work out the road distance from our pickup point, which sets the delivery fee, and
          to tell the agent where to go.
        </p>
        <p>
          The customer app reads your location <strong>only while you are using it</strong>, when you
          tap "use my current location". It never tracks you in the background, and the app does not
          ask for background location permission at all.
        </p>
      </section>

      <section className="static-card">
        <h3 className="static-card__sub">Your orders</h3>
        <p>
          What you ordered, the quantities and prices at the time, the delivery fee, taxes and total,
          the delivery address, and the times the order was placed, picked up and delivered. If you
          set up a repeat delivery, we keep the basket and the day of the month you chose.
        </p>
      </section>

      <section className="static-card">
        <h3 className="static-card__sub">Notifications</h3>
        <p>
          If you allow notifications, we store the notification token your phone or browser gives us,
          along with whether it is an Android or iOS device. It identifies the device, not you
          personally, and it is deleted when you sign out or turn notifications off.
        </p>
      </section>

      <h2 className="static-page__subheading">What we collect from delivery agents</h2>

      <section className="static-card">
        <h3 className="static-card__sub">Agent details and location</h3>
        <p>
          Agents are given an account by our office. We hold their name, phone number, and — where
          recorded — vehicle registration and photograph, which are shown to the customer waiting for
          that delivery so they can recognise who is arriving.
        </p>
        <p>
          <strong>While an agent is carrying an active delivery</strong>, the Partner app shares
          their location so the waiting customer can see them approaching on a map. This runs as a
          foreground service with a visible notification, so it is never hidden, and it stops when
          the delivery is completed or the agent signs out. Agents are not tracked when off duty or
          between deliveries. The last known position stays attached to that order.
        </p>
      </section>

      <h2 className="static-page__subheading">What we never collect</h2>

      <section className="static-card">
        <p>
          We do not take card, UPI or bank details — orders are cash on delivery, and no payment
          gateway is connected. We do not read your contacts, photos, files, messages, call history
          or microphone. We do not buy or sell personal data, and we do not use it for advertising.
        </p>
      </section>

      <h2 className="static-page__subheading">Who else sees your information</h2>

      <section className="static-card">
        <p>
          Only the people and services that need it to get your order to you:
        </p>
        <ul className="static-list">
          <li>
            <strong>Your delivery agent</strong> — your name, phone number, delivery address and the
            items, for the order they are carrying. Not your email, and not your other orders.
          </li>
          <li>
            <strong>Supabase</strong> — hosts our database and servers, in their Mumbai region.
          </li>
          <li>
            <strong>Google</strong> — the Routes API receives the pickup and delivery coordinates to
            calculate the distance for your fee. Firebase Cloud Messaging delivers notifications to
            your phone.
          </li>
          <li>
            <strong>Mapbox</strong> — draws the maps you see and turns a map point into a readable
            address. It receives coordinates.
          </li>
          <li>
            <strong>2Factor</strong> — sends your one-time sign-in code. It receives your phone
            number.
          </li>
          <li>
            <strong>Vercel</strong> — hosts our website.
          </li>
        </ul>
        <p>
          We will also share information where the law requires it. Beyond that, nobody.
        </p>
      </section>

      <h2 className="static-page__subheading">How long we keep it</h2>

      <section className="static-card">
        <p>
          Your account and order history are kept while your account exists, so you can see past
          orders and reorder from them. Sign-in codes expire within minutes. Sign-in sessions expire
          after 30 days. Notification tokens are removed when you sign out or when the notification
          service tells us the device is gone.
        </p>
      </section>

      <h2 className="static-page__subheading">Deleting your data</h2>

      <section className="static-card">
        <p>
          Call <a href="tel:+918431109368" className="static-link">+91 84311 09368</a> and ask us to
          delete your account. We will remove your account, your saved details and your order
          history.
        </p>
        <p>
          Two honest exceptions. We may keep basic records of completed orders where we are required
          to for tax or accounting. And a delivery agent's record of work done is kept as an
          employment record rather than deleted on request.
        </p>
      </section>

      <h2 className="static-page__subheading">Children</h2>

      <section className="static-card">
        <p>
          The service is not intended for children under 18, and we do not knowingly collect their
          information. If you believe a child has given us information, call us and we will remove it.
        </p>
      </section>

      <h2 className="static-page__subheading">Changes</h2>

      <section className="static-card">
        <p>
          If we start collecting something new or sharing it somewhere new, we will update this page
          and change the date at the top. See also our{' '}
          <Link to="/terms" className="static-link">Terms</Link>.
        </p>
      </section>
    </div>
  );
}
