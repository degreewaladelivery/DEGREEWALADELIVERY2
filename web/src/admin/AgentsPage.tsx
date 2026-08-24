import { useEffect, useState } from 'react';
import { listAgents, updateAgent, deleteAgent } from './api';
import type { DeliveryAgentRow } from './types';
import { AgentFormModal } from './AgentFormModal';
import { AgentDetailsModal } from './AgentDetailsModal';

export function AgentsPage() {
  const [agents, setAgents] = useState<DeliveryAgentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<DeliveryAgentRow | null>(null);

  const load = () => {
    listAgents()
      .then(setAgents)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load agents'));
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
                <td data-label="Status">
                  {agent.is_active ? 'Active' : <span className="admin-tag admin-tag--muted">Inactive</span>}
                </td>
                <td className="admin-table__actions">
                  <button className="admin-btn admin-btn--sm admin-btn--ghost" onClick={() => setEditing(agent)}>
                    Details
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
