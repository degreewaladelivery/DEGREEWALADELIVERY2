import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listCategories, deleteCategory } from './api';
import type { CategoryRow } from './types';
import { CategoryFormModal } from './CategoryFormModal';

export function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryRow[] | null>(null);
  const [editing, setEditing] = useState<CategoryRow | null | 'new'>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    listCategories()
      .then(setCategories)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load categories'));
  };

  useEffect(load, []);

  const onDelete = async (cat: CategoryRow) => {
    if (!confirm(`Delete "${cat.name}"? This also deletes its subcategories and items.`)) return;
    await deleteCategory(cat.id);
    load();
  };

  return (
    <div>
      <div className="admin-page__head">
        <h1>Categories</h1>
        <button className="admin-btn admin-btn--primary" onClick={() => setEditing('new')}>
          + Add Category
        </button>
      </div>

      {error && <p className="admin-login__error">{error}</p>}

      <div className="admin-grid">
        {categories?.map((cat) => (
          <div key={cat.id} className={'admin-card' + (cat.is_active ? '' : ' is-inactive')}>
            <div className="admin-card__img">
              {cat.image_url ? <img src={cat.image_url} alt="" /> : <span className="admin-card__noimg">No image</span>}
              {cat.offer_badge && <span className="admin-card__badge">{cat.offer_badge}</span>}
            </div>
            <div className="admin-card__body">
              <span className="admin-swatch" style={{ background: cat.color }} title={cat.color} />
              <strong>{cat.name}</strong>
              {!cat.is_active && <span className="admin-tag admin-tag--muted">Inactive</span>}
              <div className="admin-card__actions">
                <Link to={`/admin/categories/${cat.id}`} className="admin-btn admin-btn--sm">
                  Open
                </Link>
                <button className="admin-btn admin-btn--sm admin-btn--ghost" onClick={() => setEditing(cat)}>
                  Edit
                </button>
                <button className="admin-btn admin-btn--sm admin-btn--danger" onClick={() => onDelete(cat)}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {categories && categories.length === 0 && <p className="admin-empty">No categories yet — add one to get started.</p>}

      {editing && (
        <CategoryFormModal
          category={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}
