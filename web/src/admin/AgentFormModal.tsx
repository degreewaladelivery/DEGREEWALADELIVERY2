import { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { createAgent } from './api';

export function AgentFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createAgent({ email: email.trim(), password, name: name.trim(), phone: phone.trim() });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Add Delivery Agent" onClose={onClose}>
      <form onSubmit={onSubmit} className="admin-form">
        <label className="admin-field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </label>

        <label className="admin-field">
          <span>Phone</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="10-digit mobile number" />
        </label>

        <label className="admin-field">
          <span>Login email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" />
        </label>

        <label className="admin-field">
          <span>Login password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
          <em>Share this with the agent — they'll use it to sign in at /agent/login.</em>
        </label>

        {error && <p className="admin-login__error">{error}</p>}

        <div className="admin-form__actions">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
            {saving ? 'Creating…' : 'Create Agent'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
