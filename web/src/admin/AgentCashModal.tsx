import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { listAgentSettlements, recordAgentSettlement, deleteAgentSettlement } from './api';
import type { AgentCashBalance, AgentSettlementRow } from './types';
import { formatRupees } from '../lib/format';

function when(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Records cash an agent has handed in, and shows what they have handed in
 * before.
 *
 * The history is here rather than on a separate page because the question an
 * admin actually has is "does this figure look right?", and that is answered by
 * seeing the handovers behind it.
 */
export function AgentCashModal({
  balance,
  onClose,
  onSaved,
}: {
  balance: AgentCashBalance;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(
    balance.outstanding > 0 ? String(Math.round(balance.outstanding)) : ''
  );
  const [note, setNote] = useState('');
  const [history, setHistory] = useState<AgentSettlementRow[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    listAgentSettlements(balance.agent_id)
      .then(setHistory)
      .catch(() => setHistory([]));
  };

  useEffect(load, [balance.agent_id]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter how much was handed over.');
      return;
    }
    // Warned about, not blocked: an agent can hand over more than the app has
    // recorded — an order corrected later, or cash from something off-system —
    // and refusing the entry would leave the ledger further from the truth.
    if (value > balance.outstanding + 1) {
      const ok = confirm(
        `That is more than the ${formatRupees(balance.outstanding)} recorded as outstanding. Record it anyway?`
      );
      if (!ok) return;
    }

    setSaving(true);
    setError(null);
    try {
      await recordAgentSettlement(balance.agent_id, value, note);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record that');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (row: AgentSettlementRow) => {
    if (!confirm(`Remove the ${formatRupees(row.amount)} handover from ${when(row.settled_at)}?`)) {
      return;
    }
    try {
      await deleteAgentSettlement(row.id);
      load();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove that');
    }
  };

  return (
    <Modal title={`Cash — ${balance.name}`} onClose={onClose}>
      <div className="admin-cash__figures">
        <div>
          <strong>{formatRupees(balance.collected)}</strong>
          <span>Collected</span>
        </div>
        <div>
          <strong>{formatRupees(balance.settled)}</strong>
          <span>Handed in</span>
        </div>
        <div className="admin-cash__out">
          <strong>{formatRupees(balance.outstanding)}</strong>
          <span>Outstanding</span>
        </div>
      </div>

      <form onSubmit={onSubmit} className="admin-form">
        <label className="admin-field">
          <span>Amount handed over</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
            inputMode="decimal"
            placeholder="0"
            autoFocus
          />
        </label>

        <label className="admin-field">
          <span>Note</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional — e.g. handed to office, UPI reference"
          />
        </label>

        {error && <p className="admin-login__error">{error}</p>}

        <div className="admin-form__actions">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={onClose}>
            Close
          </button>
          <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
            {saving ? 'Recording…' : 'Record handover'}
          </button>
        </div>
      </form>

      <h3 className="admin-cash__histHead">Previous handovers</h3>
      {!history && <p className="admin-empty">Loading…</p>}
      {history && history.length === 0 && (
        <p className="admin-empty">Nothing handed in yet.</p>
      )}
      {history && history.length > 0 && (
        <ul className="admin-cash__hist">
          {history.map((row) => (
            <li key={row.id}>
              <span className="admin-cash__histAmount">{formatRupees(row.amount)}</span>
              <span className="admin-cash__histWhen">{when(row.settled_at)}</span>
              {row.note && <span className="admin-cash__histNote">{row.note}</span>}
              <button
                type="button"
                className="admin-btn admin-btn--sm admin-btn--danger"
                onClick={() => onDelete(row)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
