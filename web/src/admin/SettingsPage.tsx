import { useEffect, useState } from 'react';
import { LocationPicker } from '../components/ui/LocationPicker';
import { getAppSettings, updateAppSettings } from './api';
import { HomeBannerSection } from './HomeBannerSection';

export function SettingsPage() {
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    getAppSettings()
      .then((settings) => {
        setLatitude(settings.pickup_latitude);
        setLongitude(settings.pickup_longitude);
        setLoaded(true);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load settings'));
  }, []);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateAppSettings({ pickup_latitude: latitude, pickup_longitude: longitude });
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="admin-page__head">
        <h1>Settings</h1>
      </div>

      <p className="admin-empty" style={{ textAlign: 'left', marginTop: 0 }}>
        Default pickup point used for delivery fare calculation on Category orders, which don't
        belong to a single shop.
      </p>

      {error && <p className="admin-login__error">{error}</p>}

      {loaded && (
        <label className="admin-field">
          <span>Default pickup location</span>
          <LocationPicker
            latitude={latitude}
            longitude={longitude}
            onChange={(lat, lng) => {
              setLatitude(lat);
              setLongitude(lng);
            }}
            allowManualEntry
          />
        </label>
      )}

      <div className="admin-form__actions">
        <button className="admin-btn admin-btn--primary" onClick={onSave} disabled={saving || !loaded}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {savedAt && <span className="admin-tag admin-tag--muted">Saved</span>}
      </div>

      <HomeBannerSection />
    </div>
  );
}
