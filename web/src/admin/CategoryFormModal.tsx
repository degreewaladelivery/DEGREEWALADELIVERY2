import { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { createCategory, updateCategory, uploadCatalogImage } from './api';
import type { CategoryRow } from './types';

export function CategoryFormModal({
  category,
  onClose,
  onSaved,
}: {
  /** null = creating a new category; otherwise editing this one. */
  category: CategoryRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(category?.name ?? '');
  const [offerBadge, setOfferBadge] = useState(category?.offer_badge ?? '');
  const [sortOrder, setSortOrder] = useState(category?.sort_order ?? 0);
  const [isActive, setIsActive] = useState(category?.is_active ?? true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(category?.image_url ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPickImage = (file: File | undefined) => {
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let imageUrl = category?.image_url ?? null;
      if (imageFile) {
        imageUrl = await uploadCatalogImage(imageFile, 'categories');
      }

      const input = {
        name: name.trim(),
        image_url: imageUrl,
        offer_badge: offerBadge.trim() || null,
        sort_order: sortOrder,
        is_active: isActive,
      };

      if (category) {
        await updateCategory(category.id, input);
      } else {
        await createCategory(input);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={category ? 'Edit Category' : 'Add Category'} onClose={onClose}>
      <form onSubmit={onSubmit} className="admin-form">
        <label className="admin-field">
          <span>Category name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </label>

        <label className="admin-field">
          <span>Image</span>
          <input type="file" accept="image/*" onChange={(e) => onPickImage(e.target.files?.[0])} />
        </label>
        {imagePreview && <img src={imagePreview} alt="" className="admin-form__preview" />}

        <label className="admin-field">
          <span>Offer badge (optional)</span>
          <input
            value={offerBadge}
            onChange={(e) => setOfferBadge(e.target.value)}
            placeholder="e.g. 20% OFF"
          />
        </label>

        <label className="admin-field">
          <span>Sort order</span>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
          />
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
