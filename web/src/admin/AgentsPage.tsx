import { useEffect, useState } from 'react';
import { listAgents, updateAgent, deleteAgent } from './api';
import type { DeliveryAgentRow } from './types';
import { AgentFormModal } from './AgentFormModal';
import { AgentDetailsModal } from './AgentDetailsModal';
import { AgentCashModal } from './AgentCashModal';
import { listAgentCashBalances } from './api';
import type { AgentCashBalance } from './types';
import { formatRupees } from '../lib/format';

export function AgentsPage() {
  const [agents, setAgents] = useState<DeliveryAgentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<DeliveryAgentRow | null>(null);
  const [cash, setCash] = useState<AgentCashBalance[]>([]);
  const [settling, setSettling] = useState<AgentCashBalance | null>(null);

  const load = () => {
    listAgents()
      .then(setAgents)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load agents'));
    // Separate call, and a failure here must not hide the agent list — the page
    // is still useful without the money column.
    listAgentCashBalances()
      .then(setCash)
      .catch(() => setCash([]));
  };

  useEffect(load, []);

  const onToggleActive = async (agent: DeliveryAgentRow) => {
    await updateAgent(agent.user_id, { is_active: !agent.is_active });
    load();
  };

  const onDelete = async (agent: DeliveryAgentRow) => {
    if (!confirm(`Remove "${agent.name}"? They'll no longer be able to sign in.`)) return;
    try {
      await deleteAgent(agent.user_id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove agent — they may have active deliveries.');
    }
  };

  return (
    <div>
      <div className="admin-page__head">
        <h1>Delivery Agents</h1>
        {cash.some((c) => c.outstanding > 0) && (
          <span className="admin-cash__total">
            {formatRupees(cash.reduce((sum, c) => sum + Math.max(0, c.outstanding), 0))} held by
            agents
          </span>
        )}
        <button className="admin-btn admin-btn--primary" onClick={() => setAdding(true)}>
          + Add Agent
        </button>
      </div>

      {error && <p className="admin-login__error">{error}</p>}

      {agents && agents.length === 0 && (
        <p className="admin-empty">No agents yet — add one so they can sign in at /agent/login.</p>
      )}

      {agents && agents.length > 0 && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Vehicle</th>
              <th>Cash held</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => (
              <tr key={agent.user_id} className={agent.is_active ? '' : 'is-inactive'}>
                <td data-label="Name">{agent.name}</td>
                <td data-label="Phone">{agent.phone}</td>
                <td data-label="Vehicle">
                  {agent.vehicle_number || <span className="admin-customers__blank">—</span>}
                </td>
                <td data-label="Cash held">
                  {(() => {
                    const held = cash.find((c) => c.agent_id === agent.user_id)?.outstanding ?? 0;
                    return held > 0 ? (
                      <strong className="admin-cash__due">{formatRupees(held)}</strong>
                    ) : (
                      <span className="admin-customers__blank">—</span>
                    );
                  })()}
                </td>
                <td data-label="Status">
                  {agent.is_active ? 'Active' : <span className="admin-tag admin-tag--muted">Inactive</span>}
                </td>
                <td className="admin-table__actions">
                  <button className="admin-btn admin-btn--sm admin-btn--ghost" onClick={() => setEditing(agent)}>
                    Details
                  </button>
                  <button
                    className="admin-btn admin-btn--sm admin-btn--ghost"
                    onClick={() => {
                      const held = cash.find((c) => c.agent_id === agent.user_id);
                      setSettling(
                        held ?? {
                          agent_id: agent.user_id,
                          name: agent.name,
                          phone: agent.phone,
                          collected: 0,
                          settled: 0,
                          outstanding: 0,
                        }
                      );
                    }}
                  >
                    Cash
                  </button>
                  <button className="admin-btn admin-btn--sm admin-btn--ghost" onClick={() => onToggleActive(agent)}>
                    {agent.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button className="admin-btn admin-btn--sm admin-btn--danger" onClick={() => onDelete(agent)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {settling && (
        <AgentCashModal
          balance={settling}
          onClose={() => setSettling(null)}
          onSaved={() => {
            setSettling(null);
            load();
          }}
        />
      )}

      {editing && (
        <AgentDetailsModal
          agent={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      {adding && (
        <AgentFormModal
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            load();
          }}
        />
      )}
    </div>
  );
}
