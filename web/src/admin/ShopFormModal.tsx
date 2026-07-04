import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { createShop, updateShop, uploadCatalogImage, listSubcategories } from './api';
import type { CategoryRow, ShopRow, SubcategoryRow } from './types';

export function ShopFormModal({
  categories,
  shop,
  onClose,
  onSaved,
}: {
  categories: CategoryRow[];
  /** null = creating a new shop; otherwise editing this one. */
  shop: ShopRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(shop?.name ?? '');
  const [categoryId, setCategoryId] = useState(shop?.category_id ?? categories[0]?.id ?? '');
  const [subcategoryId, setSubcategoryId] = useState(shop?.subcategory_id ?? '');
  const [subcategories, setSubcategories] = useState<SubcategoryRow[]>([]);
  const [description, setDescription] = useState(shop?.description ?? '');
  const [rating, setRating] = useState(shop?.rating ?? 0);
  const [deliveryTime, setDeliveryTime] = useState(shop?.delivery_time ?? '');
  const [isFeatured, setIsFeatured] = useState(shop?.is_featured ?? false);
  const [sortOrder, setSortOrder] = useState(shop?.sort_order ?? 0);
  const [isActive, setIsActive] = useState(shop?.is_active ?? true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(shop?.image_url ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }
    listSubcategories(categoryId).then(setSubcategories).catch(() => setSubcategories([]));
  }, [categoryId]);

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
      let imageUrl = shop?.image_url ?? null;
      if (imageFile) {
        imageUrl = await uploadCatalogImage(imageFile, 'shops');
      }

      const input = {
        category_id: categoryId,
        subcategory_id: subcategoryId || null,
        name: name.trim(),
        image_url: imageUrl,
        description: description.trim() || null,
        rating,
        delivery_time: deliveryTime.trim() || null,
        is_featured: isFeatured,
        sort_order: sortOrder,
        is_active: isActive,
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

        <div className="admin-form__row">
          <label className="admin-field">
            <span>Category</span>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setSubcategoryId('');
              }}
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Subcategory (optional)</span>
            <select value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)}>
              <option value="">None</option>
              {subcategories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="admin-field">
          <span>Image</span>
          <input type="file" accept="image/*" onChange={(e) => onPickImage(e.target.files?.[0])} />
        </label>
        {imagePreview && <img src={imagePreview} alt="" className="admin-form__preview" />}

        <label className="admin-field">
          <span>Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </label>

        <div className="admin-form__row">
          <label className="admin-field">
            <span>Rating</span>
            <input
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
            />
          </label>
          <label className="admin-field">
            <span>Delivery time</span>
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
