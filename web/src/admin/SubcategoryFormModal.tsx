import { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { ImagePicker } from './ImagePicker';
import { createSubcategory, updateSubcategory, uploadCatalogImage } from './api';
import type { SubcategoryRow } from './types';

export function SubcategoryFormModal({
  categoryId,
  subcategory,
  onClose,
  onSaved,
}: {
  categoryId: string;
  /** null = creating a new subcategory; otherwise editing this one. */
  subcategory: SubcategoryRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(subcategory?.name ?? '');
  const [sortOrder, setSortOrder] = useState(subcategory?.sort_order ?? 0);
  const [isActive, setIsActive] = useState(subcategory?.is_active ?? true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(subcategory?.image_url ?? '');
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
      let imageUrl = subcategory?.image_url ?? null;
      if (imageFile) {
        imageUrl = await uploadCatalogImage(imageFile, 'subcategories');
      } else if (!imagePreview) {
        imageUrl = null;
      }

      const input = {
        category_id: categoryId,
        name: name.trim(),
        image_url: imageUrl,
        sort_order: sortOrder,
        is_active: isActive,
      };
      if (subcategory) {
        await updateSubcategory(subcategory.id, input);
      } else {
        await createSubcategory(input);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={subcategory ? 'Edit Subcategory' : 'Add Subcategory'} onClose={onClose}>
      <form onSubmit={onSubmit} className="admin-form">
        <label className="admin-field">
          <span>Subcategory name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </label>

        <ImagePicker label="Image" preview={imagePreview} onPick={onPickImage} onRemove={onRemoveImage} />

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
