import type { OrderStatus } from '@shared/types';
import { orderStatusColors, orderStatusLabels } from '@shared/tokens';
import './StatusBadge.css';

export function StatusBadge({ status }: { status: OrderStatus }) {
  const color = orderStatusColors[status];
  return (
    <span className="status-badge" style={{ color, background: `${color}1a` }}>
      <span className="status-badge__dot" style={{ background: color }} />
      {orderStatusLabels[status]}
    </span>
  );
}
