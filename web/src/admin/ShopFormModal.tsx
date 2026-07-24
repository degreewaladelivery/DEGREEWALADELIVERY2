import { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { ImagePicker } from './ImagePicker';
import { LocationPicker } from '../components/ui/LocationPicker';
import { createShop, updateShop, uploadCatalogImage } from './api';
import type { ShopRow } from './types';

export function ShopFormModal({
  shop,
  onClose,
  onSaved,
}: {

  shop: ShopRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(shop?.name ?? '');
  const [description, setDescription] = useState(shop?.description ?? '');
  const [rating, setRating] = useState<number | ''>(shop?.rating ?? '');
  const [deliveryTime, setDeliveryTime] = useState(shop?.delivery_time ?? '');
  const [isFeatured, setIsFeatured] = useState(shop?.is_featured ?? false);
  const [sortOrder, setSortOrder] = useState(shop?.sort_order ?? 0);
  const [isActive, setIsActive] = useState(shop?.is_active ?? true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(shop?.image_url ?? '');
  const [latitude, setLatitude] = useState<number | null>(shop?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(shop?.longitude ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPickImage = (file: File) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const onRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let imageUrl = shop?.image_url ?? null;
      if (imageFile) {
        imageUrl = await uploadCatalogImage(imageFile, 'shops');
      } else if (!imagePreview) {
        imageUrl = null;
      }

      const input = {
        name: name.trim(),
        image_url: imageUrl,
        description: description.trim() || null,
        rating: rating === '' ? null : rating,
        delivery_time: deliveryTime.trim() || null,
        is_featured: isFeatured,
        sort_order: sortOrder,
        is_active: isActive,
        latitude,
        longitude,
      };

      if (shop) {
        await updateShop(shop.id, input);
      } else {
        await createShop(input);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={shop ? 'Edit Shop' : 'Add Shop'} onClose={onClose}>
      <form onSubmit={onSubmit} className="admin-form">
        <label className="admin-field">
          <span>Shop name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </label>

        <ImagePicker label="Image" preview={imagePreview} onPick={onPickImage} onRemove={onRemoveImage} />

        <label className="admin-field">
          <span>Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </label>

        <div className="admin-form__row">
          <label className="admin-field">
            <span>Rating (optional)</span>
            <input
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={rating}
              onChange={(e) => setRating(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </label>
          <label className="admin-field">
            <span>Delivery time (optional)</span>
            <input
              value={deliveryTime}
              onChange={(e) => setDeliveryTime(e.target.value)}
              placeholder="e.g. 25-30 min"
            />
          </label>
        </div>

        <label className="admin-field">
          <span>Sort order</span>
          <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
        </label>

        <label className="admin-field">
          <span>Pickup location (for delivery fare)</span>
          <LocationPicker
            latitude={latitude}
            longitude={longitude}
            onChange={(lat, lng) => {
              setLatitude(lat);
              setLongitude(lng);
            }}
          />
        </label>

        <label className="admin-field admin-field--row">
          <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
          <span>Featured on home page</span>
        </label>

        <label className="admin-field admin-field--row">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <span>Active (visible to customers)</span>
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
