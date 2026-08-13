import { Link } from 'react-router-dom';
import { useOrderAlerts } from '../../lib/useOrderAlerts';
import './OrderAlerts.css';

const ICONS: Record<string, string> = {
  claimed: '🛵',
  picked_up: '📦',
  delivered: '✅',
  cancelled: '⚠️',
};

export function OrderAlerts() {
  const { alerts, dismiss } = useOrderAlerts();

  if (alerts.length === 0) return null;

  return (
    <div className="order-alerts" role="status" aria-live="polite">
      {alerts.map((alert) => (
        <div
          key={alert.orderId}
          className={'order-alert' + (alert.status === 'cancelled' ? ' is-bad' : '')}
        >
          <span className="order-alert__icon">{ICONS[alert.status] ?? '🔔'}</span>
          <div className="order-alert__body">
            <strong className="order-alert__title">{alert.title}</strong>
            <span className="order-alert__text">{alert.body}</span>
            <Link to="/track" className="order-alert__link" onClick={() => dismiss(alert.orderId)}>
              Track order
            </Link>
          </div>
          <button
            className="order-alert__close"
            onClick={() => dismiss(alert.orderId)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
