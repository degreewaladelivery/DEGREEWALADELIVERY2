import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { ImagePicker } from './ImagePicker';
import {
  updateAgent,
  uploadCatalogImage,
  uploadAgentDocument,
  signedAgentDocumentUrl,
  deleteAgentDocument,
} from './api';
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
  const [licenceNumber, setLicenceNumber] = useState(agent.licence_number ?? '');
  const [idProofPath, setIdProofPath] = useState<string | null>(agent.id_proof_path);
  const [licencePath, setLicencePath] = useState<string | null>(agent.licence_path);
  // Signed links, fetched only to show the thumbnails. They expire in minutes,
  // so nothing long-lived points at a licence. Held with the path they belong
  // to, so a freshly uploaded document never briefly shows the previous one.
  const [idProofSigned, setIdProofSigned] = useState<{ path: string; url: string } | null>(null);
  const [licenceSigned, setLicenceSigned] = useState<{ path: string; url: string } | null>(null);
  const [emergency, setEmergency] = useState(agent.emergency_contact ?? '');
  const [verified, setVerified] = useState(Boolean(agent.kyc_verified_at));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File, apply: (url: string) => void) => {
    setSaving(true);
    setError(null);
    try {
      apply(await uploadCatalogImage(file, 'agents'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload that image');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!idProofPath) return;
    let cancelled = false;
    signedAgentDocumentUrl(idProofPath).then((url) => {
      if (!cancelled && url) setIdProofSigned({ path: idProofPath, url });
    });
    return () => {
      cancelled = true;
    };
  }, [idProofPath]);

  useEffect(() => {
    if (!licencePath) return;
    let cancelled = false;
    signedAgentDocumentUrl(licencePath).then((url) => {
      if (!cancelled && url) setLicenceSigned({ path: licencePath, url });
    });
    return () => {
      cancelled = true;
    };
  }, [licencePath]);

  // Derived, so clearing a document empties the preview at once rather than
  // waiting on an effect.
  const idProofPreview = idProofSigned?.path === idProofPath ? idProofSigned.url : '';
  const licencePreview = licenceSigned?.path === licencePath ? licenceSigned.url : '';

  const uploadDoc = async (file: File, apply: (path: string) => void) => {
    setSaving(true);
    setError(null);
    try {
      apply(await uploadAgentDocument(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload that document');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Opens a document in a new tab.
   *
   * The tab is opened before the signed link is fetched, because a popup opened
   * after an await is blocked — the browser no longer connects it to the click.
   */
  const viewDoc = async (path: string | null) => {
    if (!path) return;
    const tab = window.open('', '_blank', 'noopener');
    const url = await signedAgentDocumentUrl(path);
    if (!url) {
      tab?.close();
      setError('Could not open that document.');
      return;
    }
    if (tab) tab.location.href = url;
  };

  const downloadDoc = async (path: string | null, name: string) => {
    if (!path) return;
    const ext = path.split('.').pop() ?? 'jpg';
    const url = await signedAgentDocumentUrl(path, `${agent.name}-${name}.${ext}`);
    if (!url) {
      setError('Could not download that document.');
      return;
    }
    // An anchor rather than assigning location: the header makes it save, and
    // the admin page stays where it is.
    const link = document.createElement('a');
    link.href = url;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const removeDoc = async (path: string | null, clear: () => void) => {
    clear();
    if (path) await deleteAgentDocument(path).catch(() => undefined);
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
        licence_number: licenceNumber.trim().toUpperCase() || null,
        id_proof_path: idProofPath,
        licence_path: licencePath,
        emergency_contact: emergency.trim() || null,
        // Stamped when the box is ticked, cleared when it is unticked, so the
        // date always means "checked on".
        kyc_verified_at: verified
          ? agent.kyc_verified_at ?? new Date().toISOString()
          : null,
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
          label="Agent's photo — their face, not the vehicle"
          preview={photoUrl ?? ''}
          onPick={(file) => upload(file, setPhotoUrl)}
          onRemove={() => setPhotoUrl(null)}
        />
        <p className="admin-empty" style={{ textAlign: 'left', marginTop: 0 }}>
          A clear head-and-shoulders photo. The customer sees it beside the agent's name while they
          are on the way, so they can recognise who is walking up. The vehicle is identified by its
          number above.
        </p>

        <label className="admin-field">
          <span>Emergency contact</span>
          <input
            value={emergency}
            onChange={(e) => setEmergency(e.target.value)}
            placeholder="Number this agent should call for help"
          />
          <em>Used by the Call support button in their app. Falls back to the office number.</em>
        </label>

        <h3 className="admin-cash__histHead">Documents</h3>

        <label className="admin-field">
          <span>Driving licence number</span>
          <input
            value={licenceNumber}
            onChange={(e) => setLicenceNumber(e.target.value)}
            placeholder="KA18 20230001234"
          />
          <em>
            Do not record Aadhaar numbers here. A photograph of the card is enough, and storing the
            number brings obligations a delivery service should not take on.
          </em>
        </label>

        <ImagePicker
          label="ID proof (photo of the document)"
          preview={idProofPreview}
          onPick={(file) => uploadDoc(file, setIdProofPath)}
          onRemove={() => removeDoc(idProofPath, () => setIdProofPath(null))}
        />
        {idProofPath && (
          <div className="admin-doc__actions">
            <button
              type="button"
              className="admin-btn admin-btn--sm admin-btn--brand"
              onClick={() => viewDoc(idProofPath)}
            >
              View full size
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--sm admin-btn--ghost"
              onClick={() => downloadDoc(idProofPath, 'id-proof')}
            >
              Download
            </button>
          </div>
        )}

        <ImagePicker
          label="Driving licence (photo)"
          preview={licencePreview}
          onPick={(file) => uploadDoc(file, setLicencePath)}
          onRemove={() => removeDoc(licencePath, () => setLicencePath(null))}
        />
        {licencePath && (
          <div className="admin-doc__actions">
            <button
              type="button"
              className="admin-btn admin-btn--sm admin-btn--brand"
              onClick={() => viewDoc(licencePath)}
            >
              View full size
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--sm admin-btn--ghost"
              onClick={() => downloadDoc(licencePath, 'licence')}
            >
              Download
            </button>
          </div>
        )}

        <p className="admin-empty" style={{ textAlign: 'left' }}>
          Documents are stored privately and are visible only to admins here. They are never shown
          to customers or to the agent's app.
        </p>

        <label className="admin-check">
          <input
            type="checkbox"
            checked={verified}
            onChange={(e) => setVerified(e.target.checked)}
          />
          <span>
            I have seen the original documents
            {agent.kyc_verified_at
              ? ` — verified ${new Date(agent.kyc_verified_at).toLocaleDateString('en-IN')}`
              : ''}
          </span>
        </label>

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
