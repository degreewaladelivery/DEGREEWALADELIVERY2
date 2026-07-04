import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listShops, listCategories, deleteShop } from './api';
import type { ShopRow, CategoryRow } from './types';
import { ShopFormModal } from './ShopFormModal';

export function ShopsPage() {
  const [shops, setShops] = useState<ShopRow[] | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [editing, setEditing] = useState<ShopRow | null | 'new'>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    listShops()
      .then(setShops)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load shops'));
    listCategories().then(setCategories).catch(() => {});
  };

  useEffect(load, []);

  const onDelete = async (shop: ShopRow) => {
    if (!confirm(`Delete "${shop.name}"? This also deletes its categories and items.`)) return;
    await deleteShop(shop.id);
    load();
  };

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? '—';

  return (
    <div>
      <div className="admin-page__head">
        <h1>Shops</h1>
        <button
          className="admin-btn admin-btn--primary"
          onClick={() => setEditing('new')}
          disabled={categories.length === 0}
        >
          + Add Shop
        </button>
      </div>

      {categories.length === 0 && (
        <p className="admin-empty">Add a category first — every shop needs one.</p>
      )}
      {error && <p className="admin-login__error">{error}</p>}

      <div className="admin-grid">
        {shops?.map((shop) => (
          <div key={shop.id} className={'admin-card' + (shop.is_active ? '' : ' is-inactive')}>
            <div className="admin-card__img">
              {shop.image_url ? <img src={shop.image_url} alt="" /> : <span className="admin-card__noimg">No image</span>}
              {shop.is_featured && <span className="admin-card__badge">Featured</span>}
            </div>
            <div className="admin-card__body">
              <strong>{shop.name}</strong>
              {!shop.is_active && <span className="admin-tag admin-tag--muted">Inactive</span>}
              <p className="admin-shop__meta">
                {categoryName(shop.category_id)}
                {shop.rating > 0 && <> · ★ {shop.rating.toFixed(1)}</>}
                {shop.delivery_time && <> · {shop.delivery_time}</>}
              </p>
              <div className="admin-card__actions">
                <Link to={`/admin/shops/${shop.id}`} className="admin-btn admin-btn--sm">
                  Open
                </Link>
                <button className="admin-btn admin-btn--sm admin-btn--ghost" onClick={() => setEditing(shop)}>
                  Edit
                </button>
                <button className="admin-btn admin-btn--sm admin-btn--danger" onClick={() => onDelete(shop)}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {shops && shops.length === 0 && <p className="admin-empty">No shops yet — add one to get started.</p>}

      {editing && (
        <ShopFormModal
          categories={categories}
          shop={editing === 'new' ? null : editing}
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
