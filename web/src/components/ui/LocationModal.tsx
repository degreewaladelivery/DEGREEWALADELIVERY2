import { useEffect, useState } from 'react';
import { LocationPicker } from './LocationPicker';
import { useLocationStore } from '../../store/locationStore';
import { MAPBOX_TOKEN } from '../../lib/mapbox';
import { reverseGeocode } from '@shared/deliveryLocation';
import './LocationModal.css';

export function LocationModal({ onClose }: { onClose: () => void }) {
  const saved = useLocationStore((s) => s.location);
  const setLocation = useLocationStore((s) => s.setLocation);
  const markPrompted = useLocationStore((s) => s.markPrompted);

  const [latitude, setLatitude] = useState<number | null>(saved?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(saved?.longitude ?? null);
  const [resolved, setResolved] = useState<{ label: string; address: string } | null>(
    saved ? { label: saved.label, address: saved.address } : null
  );
  const [saving, setSaving] = useState(false);

  const dismiss = () => {
    markPrompted();
    onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      markPrompted();
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [markPrompted, onClose]);

  useEffect(() => {
    if (latitude == null || longitude == null) return;
    let cancelled = false;
    reverseGeocode(MAPBOX_TOKEN ?? '', latitude, longitude).then((place) => {
      if (!cancelled) setResolved(place);
    });
    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  const onSave = () => {
    if (latitude == null || longitude == null || !resolved) return;
    setSaving(true);
    setLocation({ latitude, longitude, label: resolved.label, address: resolved.address });
    onClose();
  };

  return (
    <div className="locmodal__backdrop" onClick={dismiss} role="presentation">
      <div
        className="locmodal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="locmodal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="locmodal__head">
          <h3 id="locmodal-title" className="locmodal__title">Where are we delivering?</h3>
          <button className="locmodal__close" onClick={dismiss} aria-label="Close">×</button>
        </div>

        <p className="locmodal__lead">
          We use this to work out your delivery fee and guide the agent to your door.
        </p>

        <LocationPicker
          latitude={latitude}
          longitude={longitude}
          onChange={(lat, lng) => {
            setLatitude(lat);
            setLongitude(lng);
          }}
        />

        {resolved && latitude != null && (
          <p className="locmodal__resolved">
            <strong>{resolved.label}</strong>
            <span>{resolved.address}</span>
          </p>
        )}

        <div className="locmodal__actions">
          <button type="button" className="btn btn-light btn-md" onClick={dismiss}>
            Not now
          </button>
          <button
            type="button"
            className="btn btn-primary btn-md"
            onClick={onSave}
            disabled={latitude == null || !resolved || saving}
          >
            Save location
          </button>
        </div>
      </div>
    </div>
  );
}
