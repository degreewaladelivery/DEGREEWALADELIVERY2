import { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { createShopCategory, updateShopCategory, uploadCatalogImage } from './api';
import type { ShopCategoryRow } from './types';

export function ShopCategoryFormModal({
  shopId,
  shopCategory,
  onClose,
  onSaved,
}: {
  shopId: string;
  /** null = creating a new shop category; otherwise editing this one. */
  shopCategory: ShopCategoryRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(shopCategory?.name ?? '');
  const [sortOrder, setSortOrder] = useState(shopCategory?.sort_order ?? 0);
  const [isActive, setIsActive] = useState(shopCategory?.is_active ?? true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(shopCategory?.image_url ?? '');
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
      let imageUrl = shopCategory?.image_url ?? null;
      if (imageFile) {
        imageUrl = await uploadCatalogImage(imageFile, 'shop-categories');
      }

      const input = { shop_id: shopId, name: name.trim(), image_url: imageUrl, sort_order: sortOrder, is_active: isActive };
      if (shopCategory) {
        await updateShopCategory(shopCategory.id, input);
      } else {
        await createShopCategory(input);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={shopCategory ? 'Edit Category' : 'Add Category'} onClose={onClose}>
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
          <span>Sort order</span>
          <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
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
