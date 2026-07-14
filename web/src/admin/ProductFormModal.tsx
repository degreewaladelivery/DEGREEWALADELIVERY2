import { useState, useEffect, type FormEvent } from 'react';
import { Modal } from './Modal';
import { ImagePicker } from './ImagePicker';
import { createProduct, updateProduct, uploadCatalogImage, listShopCategories } from './api';
import type { ProductRow, SubcategoryRow, ShopRow, ShopCategoryRow } from './types';

export function ProductFormModal({
  categoryId,
  subcategories,
  shops,
  product,
  onClose,
  onSaved,
}: {
  categoryId: string;
  subcategories: SubcategoryRow[];
  shops: ShopRow[];
  /** null = creating a new item; otherwise editing this one. */
  product: ProductRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product?.name ?? '');
  const [subcategoryId, setSubcategoryId] = useState(product?.subcategory_id ?? '');
  const [shopId, setShopId] = useState(product?.shop_id ?? '');
  const [shopCategoryId, setShopCategoryId] = useState(product?.shop_category_id ?? '');
  const [shopCategories, setShopCategories] = useState<ShopCategoryRow[]>([]);
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

  // Load the linked shop's own categories so we can offer them below.
  useEffect(() => {
    if (!shopId) {
      setShopCategories([]);
      return;
    }
    let active = true;
    listShopCategories(shopId)
      .then((rows) => active && setShopCategories(rows))
      .catch(() => active && setShopCategories([]));
    return () => {
      active = false;
    };
  }, [shopId]);

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
        imageUrl = await uploadCatalogImage(imageFile, 'products');
      } else if (!imagePreview) {
        imageUrl = null;
      }

      const input = {
        category_id: categoryId,
        subcategory_id: subcategoryId || null,
        shop_id: shopId || null,
        shop_category_id: shopId ? shopCategoryId || null : null,
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
          <span>Also show in shop <em>(optional)</em></span>
          <select
            value={shopId}
            onChange={(e) => {
              setShopId(e.target.value);
              setShopCategoryId(''); // reset — a new shop has its own categories
            }}
          >
            <option value="">Not shown in any shop</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        {shopId && shopCategories.length > 0 && (
          <label className="admin-field">
            <span>Shop category <em>(optional)</em></span>
            <select value={shopCategoryId} onChange={(e) => setShopCategoryId(e.target.value)}>
              <option value="">Directly in the shop (no category)</option>
              {shopCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}

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
