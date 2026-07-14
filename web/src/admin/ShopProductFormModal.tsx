import { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { ImagePicker } from './ImagePicker';
import { createShopProduct, updateShopProduct, uploadCatalogImage } from './api';
import type { ShopProductRow, ShopCategoryRow } from './types';

export function ShopProductFormModal({
  shopId,
  shopCategories,
  product,
  onClose,
  onSaved,
}: {
  shopId: string;
  shopCategories: ShopCategoryRow[];
  /** null = creating a new item; otherwise editing this one. */
  product: ShopProductRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product?.name ?? '');
  const [shopCategoryId, setShopCategoryId] = useState(product?.shop_category_id ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [unit, setUnit] = useState(product?.unit ?? '');
  const [barcode, setBarcode] = useState(product?.barcode ?? '');
  const [gstPercent, setGstPercent] = useState<number | ''>(product?.gst_percent ?? '');
  const [mrp, setMrp] = useState<number | ''>(product?.mrp ?? '');
  const [retailPrice, setRetailPrice] = useState<number | ''>(product?.retail_price ?? '');
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(product?.image_url ?? '');
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
      let imageUrl = product?.image_url ?? null;
      if (imageFile) {
        imageUrl = await uploadCatalogImage(imageFile, 'shop-products');
      } else if (!imagePreview) {
        imageUrl = null;
      }

      const input = {
        shop_id: shopId,
        shop_category_id: shopCategoryId || null,
        name: name.trim(),
        description: description.trim() || null,
        unit: unit.trim() || null,
        barcode: barcode.trim() || null,
        gst_percent: gstPercent === '' ? 0 : gstPercent,
        mrp: mrp === '' ? 0 : mrp,
        retail_price: retailPrice === '' ? 0 : retailPrice,
        image_url: imageUrl,
        is_active: isActive,
      };

      if (product) {
        await updateShopProduct(product.id, input);
      } else {
        await createShopProduct(input);
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
          <span>Category (optional)</span>
          <select value={shopCategoryId} onChange={(e) => setShopCategoryId(e.target.value)}>
            <option value="">No category (directly in shop)</option>
            {shopCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="admin-field">
          <span>Description <em>(public)</em></span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </label>

        <label className="admin-field">
          <span>Pack size / unit <em>(optional)</em></span>
          <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. 1 kg, 500 ml, 6 pcs" />
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
              placeholder="e.g. 5"
              value={gstPercent}
              onChange={(e) => setGstPercent(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </label>
          <label className="admin-field">
            <span>MRP (₹)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 120"
              value={mrp}
              onChange={(e) => setMrp(e.target.value === '' ? '' : Number(e.target.value))}
              required
            />
          </label>
          <label className="admin-field">
            <span>Retail price (₹)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 99"
              value={retailPrice}
              onChange={(e) => setRetailPrice(e.target.value === '' ? '' : Number(e.target.value))}
              required
            />
          </label>
        </div>

        <ImagePicker label="Item image" preview={imagePreview} onPick={onPickImage} onRemove={onRemoveImage} />

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
