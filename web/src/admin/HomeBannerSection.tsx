import { useEffect, useState } from 'react';
import { ImagePicker } from './ImagePicker';
import { getHomeBanner, saveHomeBanner, uploadCatalogImage, listCategories } from './api';
import type { CategoryRow } from './types';

/**
 * The home page hero, editable without a release.
 *
 * Saving happens per action rather than behind one button: uploading a picture
 * and toggling the banner off are separate intentions, and an admin who uploads
 * then navigates away should not find nothing changed.
 */
export function HomeBannerSection() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [ctaCategoryId, setCtaCategoryId] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([getHomeBanner(), listCategories()])
      .then(([banner, cats]) => {
        setImageUrl(banner.image_url);
        setCtaCategoryId(banner.cta_category_id ?? '');
        setIsActive(banner.is_active);
        setCategories(cats);
        setLoaded(true);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load the banner'));
  }, []);

  const persist = async (patch: Parameters<typeof saveHomeBanner>[0]) => {
    setBusy(true);
    setError(null);
    try {
      await saveHomeBanner(patch);
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save the banner');
    } finally {
      setBusy(false);
    }
  };

  const onPick = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const url = await uploadCatalogImage(file, 'banners');
      setImageUrl(url);
      await saveHomeBanner({ image_url: url });
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload that image');
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) {
    return (
      <section className="admin-section">
        <div className="admin-section__head">
          <h2>Home banner</h2>
        </div>
        {error ? <p className="admin-login__error">{error}</p> : <p className="admin-empty">Loading…</p>}
      </section>
    );
  }

  return (
    <section className="admin-section">
      <div className="admin-section__head">
        <h2>Home banner</h2>
        {savedAt && <span className="admin-tag admin-tag--muted">Saved</span>}
      </div>

      <p className="admin-empty" style={{ textAlign: 'left', marginTop: 0 }}>
        The large picture at the top of the home page, on both the website and the app. Use a wide
        image — it is displayed roughly twice as wide as it is tall. Remove it to go back to the
        one built into the app.
      </p>

      {error && <p className="admin-login__error">{error}</p>}

      <ImagePicker
        label="Banner image"
        preview={imageUrl ?? ''}
        onPick={onPick}
        onRemove={() => {
          setImageUrl(null);
          persist({ image_url: null });
        }}
      />

      <label className="admin-field">
        <span>ORDER NOW opens</span>
        <select
          value={ctaCategoryId}
          disabled={busy}
          onChange={(e) => {
            const next = e.target.value;
            setCtaCategoryId(next);
            persist({ cta_category_id: next || null });
          }}
        >
          <option value="">Nothing — button does not appear</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <label className="admin-check">
        <input
          type="checkbox"
          checked={isActive}
          disabled={busy}
          onChange={(e) => {
            const next = e.target.checked;
            setIsActive(next);
            persist({ is_active: next });
          }}
        />
        <span>Show the banner on the home page</span>
      </label>
    </section>
  );
}
