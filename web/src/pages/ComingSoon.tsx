import { Link, useRouteError } from 'react-router-dom';

/**
 * Doubles as a friendly placeholder for not-yet-built routes (Track, Help)
 * and as the router's error/404 fallback.
 */
export function ComingSoon({ title = 'Coming Soon' }: { title?: string }) {
  return (
    <div className="container cart-empty">
      <span className="cart-empty__icon">🚧</span>
      <h2>{title}</h2>
      <p>This part of Degreewala is on the way. Check back shortly!</p>
      <Link to="/" className="btn btn-primary btn-lg">Back to Home</Link>
    </div>
  );
}

/** Router error boundary (e.g. unknown URL). */
export function RouteError() {
  const error = useRouteError();
  console.error(error);
  return <ComingSoon title="Page not found" />;
}
