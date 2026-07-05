import { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { createProduct, updateProduct, uploadCatalogImage } from './api';
import type { ProductRow, SubcategoryRow } from './types';

export function ProductFormModal({
  categoryId,
  subcategories,
  product,
  onClose,
  onSaved,
}: {
  categoryId: string;
  subcategories: SubcategoryRow[];
  /** null = creating a new item; otherwise editing this one. */
  product: ProductRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product?.name ?? '');
  const [subcategoryId, setSubcategoryId] = useState(product?.subcategory_id ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [barcode, setBarcode] = useState(product?.barcode ?? '');
  const [gstPercent, setGstPercent] = useState(product?.gst_percent ?? 0);
  const [mrp, setMrp] = useState(product?.mrp ?? 0);
  const [retailPrice, setRetailPrice] = useState(product?.retail_price ?? 0);
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(product?.image_url ?? '');
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
      let imageUrl = product?.image_url ?? null;
      if (imageFile) {
        imageUrl = await uploadCatalogImage(imageFile, 'products');
      }

      const input = {
        category_id: categoryId,
        subcategory_id: subcategoryId || null,
        name: name.trim(),
        description: description.trim() || null,
        barcode: barcode.trim() || null,
        gst_percent: gstPercent,
        mrp,
        retail_price: retailPrice,
        image_url: imageUrl,
        is_active: isActive,
      };

      if (product) {
        await updateProduct(product.id, input);
      } else {
        await createProduct(input);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={product ? 'Edit Item' : 'Add Item'} onClose={onClose}>
      <form onSubmit={onSubmit} className="admin-form">
        <label className="admin-field">
          <span>Item name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </label>

        <label className="admin-field">
          <span>Subcategory (optional)</span>
          <select value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)}>
            <option value="">No subcategory (directly in category)</option>
            {subcategories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="admin-field">
          <span>Description <em>(public)</em></span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </label>

        <label className="admin-field">
          <span>Barcode <em>(private — admin only)</em></span>
          <input value={barcode} onChange={(e) => setBarcode(e.target.value)} />
        </label>

        <div className="admin-form__row">
          <label className="admin-field">
            <span>GST %</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={gstPercent}
              onChange={(e) => setGstPercent(Number(e.target.value))}
            />
          </label>
          <label className="admin-field">
            <span>MRP (₹)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={mrp}
              onChange={(e) => setMrp(Number(e.target.value))}
              required
            />
          </label>
          <label className="admin-field">
            <span>Retail price (₹)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={retailPrice}
              onChange={(e) => setRetailPrice(Number(e.target.value))}
              required
            />
          </label>
        </div>

        <label className="admin-field">
          <span>Item image</span>
          <input type="file" accept="image/*" onChange={(e) => onPickImage(e.target.files?.[0])} />
        </label>
        {imagePreview && <img src={imagePreview} alt="" className="admin-form__preview" />}

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
