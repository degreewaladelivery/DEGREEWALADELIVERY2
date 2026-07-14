import { Link, useRouteError } from 'react-router-dom';

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

export function RouteError() {
  const error = useRouteError();
  console.error(error);
  return <ComingSoon title="Page not found" />;
}
