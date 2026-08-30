import { useEffect, useState } from 'react';
import { useAgentAuth } from './AgentAuthContext';
import { getMyProfile, listDeliveryHistory, getTodayMinutes } from './api';
import type { AgentProfile, OrderRow } from './types';
import { formatDuration, orderStatusLabel, tripMinutes } from '@shared/agentOrders';
import { formatRupees } from '../lib/format';

/** Fallback when an agent has no personal support number recorded. */
const SUPPORT_PHONE = '+918431109368';

function whenFull(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.toLocaleDateString('en-IN')} at ${date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

/**
 * The dashboard's version of the app's profile sheet.
 *
 * Everything built for the Partner app — who the office has this agent as, their
 * hours, every delivery they have made — existed only on the phone. An agent
 * working from a browser could see today's orders and nothing about their own
 * record.
 */
export function AgentProfilePage() {
  const { session } = useAgentAuth();
  const agentId = session?.user?.id ?? '';

  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [minutesToday, setMinutesToday] = useState(0);
  const [history, setHistory] = useState<OrderRow[] | null>(null);
  const [open, setOpen] = useState<OrderRow | null>(null);

  useEffect(() => {
    if (!agentId) return;
    getMyProfile().then(setProfile).catch(() => undefined);
    getTodayMinutes().then(setMinutesToday).catch(() => undefined);
    listDeliveryHistory(agentId).then(setHistory).catch(() => setHistory([]));
  }, [agentId]);

  return (
    <div>
      <div className="admin-page__head">
        <h1>My profile</h1>
      </div>

      <div className="agent-profile">
        <span className="agent-profile__avatar" aria-hidden="true">
          {profile?.photo_url ? (
            <img src={profile.photo_url} alt="" />
          ) : (
            profile?.name?.trim().charAt(0).toUpperCase() || '🛵'
          )}
        </span>
        <div>
          <strong className="agent-profile__name">{profile?.name ?? ''}</strong>
          <p className="agent-profile__meta">{profile?.phone ?? ''}</p>
          {profile?.vehicle_number && (
            <p className="agent-profile__vehicle">{profile.vehicle_number}</p>
          )}
          {/* Documents are checked by the office, so this reports the state
              rather than pretending the agent can change it. */}
          <span
            className={
              'agent-profile__kyc' + (profile?.kyc_verified_at ? ' is-ok' : '')
            }
          >
            {profile?.kyc_verified_at
              ? '✓ Documents verified'
              : 'Documents not verified yet — ask the office'}
          </span>
          <p className="agent-profile__meta">On duty today: {formatDuration(minutesToday)}</p>
        </div>
      </div>

      {/* A number, not a form. Something has gone wrong on the road when this
          is pressed. */}
      <a
        className="agent-profile__support"
        href={`tel:${profile?.emergency_contact || SUPPORT_PHONE}`}
      >
        📞 Call support
      </a>

      <section className="admin-section">
        <div className="admin-section__head">
          <h2>Past Deliveries</h2>
        </div>

        {!history && <p className="admin-empty">Loading…</p>}
        {history && history.length === 0 && (
          <p className="admin-empty">Nothing delivered yet.</p>
        )}

        {history && history.length > 0 && (
          <div className="agent-hist">
            {history.map((order) => (
              <button
                key={order.id}
                type="button"
                className="agent-hist__row"
                onClick={() => setOpen(order)}
              >
                <span className="agent-hist__col">
                  <span className="agent-hist__where">
                    {order.pickup_label} → {order.delivery_address}
                  </span>
                  <span className="agent-hist__meta">
                    {order.delivered_at
                      ? new Date(order.delivered_at).toLocaleDateString('en-IN')
                      : orderStatusLabel(order.status)}
                    {order.distance_km != null ? ` · ${order.distance_km.toFixed(1)} km` : ''}
                    {order.failure_reason ? ` · ${order.failure_reason}` : ''}
                  </span>
                </span>
                <span
                  className={
                    order.status === 'failed' ? 'agent-hist__failed' : 'agent-hist__pay'
                  }
                >
                  {order.status === 'failed' ? 'Failed' : formatRupees(order.agent_payout)}
                </span>
                <span className="agent-hist__chev" aria-hidden="true">›</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {open && (
        <div className="agent-modal__backdrop" role="dialog" aria-modal="true">
          <div className="agent-modal agent-modal--wide">
            <h2>Delivery</h2>
            <p className="agent-detail__id">#{open.id.slice(0, 8).toUpperCase()}</p>
            <p className={open.status === 'failed' ? 'agent-detail__failed' : 'agent-detail__ok'}>
              {orderStatusLabel(open.status)}
            </p>
            {open.failure_reason && <p className="agent-detail__reason">{open.failure_reason}</p>}

            <dl className="agent-detail">
              <dt>Picked up from</dt>
              <dd>{open.pickup_label}</dd>
              <dt>Delivered to</dt>
              <dd>{open.delivery_address}</dd>
              {open.distance_km != null && (
                <>
                  <dt>Distance</dt>
                  <dd>{open.distance_km.toFixed(1)} km</dd>
                </>
              )}
              <dt>Items</dt>
              <dd>
                {open.items.map((item) => (
                  <span key={item.id} className="agent-detail__item">
                    {item.name}
                    {item.unit ? ` (${item.unit})` : ''} ×{item.quantity}
                  </span>
                ))}
              </dd>
              <dt>Order total</dt>
              <dd>{formatRupees(open.total)}</dd>
              <dt>Payment</dt>
              <dd>
                {open.payment_method === 'cod'
                  ? open.cash_collected_at
                    ? 'Cash collected'
                    : 'Cash — not collected'
                  : 'Paid online'}
              </dd>
              <dt>You earned</dt>
              <dd>{formatRupees(open.agent_payout)}</dd>
              {open.claimed_at && (
                <>
                  <dt>Accepted</dt>
                  <dd>{whenFull(open.claimed_at)}</dd>
                </>
              )}
              {open.picked_up_at && (
                <>
                  <dt>Picked up</dt>
                  <dd>{whenFull(open.picked_up_at)}</dd>
                </>
              )}
              {open.delivered_at && (
                <>
                  <dt>Delivered</dt>
                  <dd>{whenFull(open.delivered_at)}</dd>
                </>
              )}
              {(() => {
                const taken = tripMinutes(open);
                return taken == null ? null : (
                  <>
                    <dt>Took</dt>
                    <dd>{formatDuration(taken)}</dd>
                  </>
                );
              })()}
            </dl>

            <button className="admin-btn admin-btn--ghost" onClick={() => setOpen(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
