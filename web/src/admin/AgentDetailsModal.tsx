import { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { ImagePicker } from './ImagePicker';
import { updateAgent, uploadCatalogImage } from './api';
import type { DeliveryAgentRow } from './types';

/**
 * The details a waiting customer is shown about their agent.
 *
 * Separate from the create form because the agents already on the books need
 * these filling in too, and creating an agent also creates their login — a
 * flow worth leaving alone.
 */
export function AgentDetailsModal({
  agent,
  onClose,
  onSaved,
}: {
  agent: DeliveryAgentRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [vehicleNumber, setVehicleNumber] = useState(agent.vehicle_number ?? '');
  const [photoUrl, setPhotoUrl] = useState<string | null>(agent.photo_url);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPick = async (file: File) => {
    setSaving(true);
    setError(null);
    try {
      setPhotoUrl(await uploadCatalogImage(file, 'agents'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload that photo');
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateAgent(agent.user_id, {
        // Registration numbers are read aloud and compared by eye, so they are
        // stored the way they are written on the plate.
        vehicle_number: vehicleNumber.trim().toUpperCase() || null,
        photo_url: photoUrl,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Details — ${agent.name}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="admin-form">
        <p className="admin-empty" style={{ textAlign: 'left', marginTop: 0 }}>
          Shown to the customer while this agent is on their way, so they know who to expect.
        </p>

        <label className="admin-field">
          <span>Vehicle number</span>
          <input
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value)}
            placeholder="KA 18 EX 1234"
            autoFocus
          />
          <em>Leave empty if they don't have one — the customer simply won't see it.</em>
        </label>

        <ImagePicker
          label="Photo"
          preview={photoUrl ?? ''}
          onPick={onPick}
          onRemove={() => setPhotoUrl(null)}
        />

        {error && <p className="admin-login__error">{error}</p>}

        <div className="admin-form__actions">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
