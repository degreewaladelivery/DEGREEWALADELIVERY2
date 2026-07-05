import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  listShops,
  listShopCategories,
  listShopProducts,
  deleteShopCategory,
  deleteShopProduct,
} from './api';
import type { ShopRow, ShopCategoryRow, ShopProductRow } from './types';
import { ShopCategoryFormModal } from './ShopCategoryFormModal';
import { ShopProductFormModal } from './ShopProductFormModal';

export function ShopDetailPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const [shop, setShop] = useState<ShopRow | null>(null);
  const [shopCategories, setShopCategories] = useState<ShopCategoryRow[]>([]);
  const [products, setProducts] = useState<ShopProductRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [editingCat, setEditingCat] = useState<ShopCategoryRow | null | 'new'>(null);
  const [editingProduct, setEditingProduct] = useState<ShopProductRow | null | 'new'>(null);

  const load = useCallback(() => {
    if (!shopId) return;
    listShops()
      .then((shops) => setShop(shops.find((s) => s.id === shopId) ?? null))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load shop'));
    listShopCategories(shopId).then(setShopCategories).catch(() => {});
    listShopProducts(shopId).then(setProducts).catch(() => {});
  }, [shopId]);

  useEffect(load, [load]);

  if (!shopId) return null;

  const onDeleteCat = async (cat: ShopCategoryRow) => {
    if (!confirm(`Delete category "${cat.name}"? Its items move to "no category".`)) return;
    await deleteShopCategory(cat.id);
    load();
  };

  const onDeleteProduct = async (p: ShopProductRow) => {
    if (!confirm(`Delete item "${p.name}"?`)) return;
    await deleteShopProduct(p.id);
    load();
  };

  const catName = (id: string | null) =>
    id ? shopCategories.find((c) => c.id === id)?.name ?? '—' : null;

  return (
    <div>
      <Link to="/admin/shops" className="admin-back">
        ‹ All shops
      </Link>
      <div className="admin-page__head">
        <h1>{shop?.name ?? '…'}</h1>
      </div>

      {error && <p className="admin-login__error">{error}</p>}

      {/* ---- Shop's own categories ---- */}
      <section className="admin-section">
        <div className="admin-section__head">
          <h2>Categories</h2>
          <button className="admin-btn admin-btn--sm" onClick={() => setEditingCat('new')}>
            + Add Category
          </button>
        </div>
        {shopCategories.length === 0 ? (
          <p className="admin-empty">
            No categories — items added below will show directly under this shop.
          </p>
        ) : (
          <div className="admin-pills">
            {shopCategories.map((c) => (
              <div key={c.id} className={'admin-pill' + (c.is_active ? '' : ' is-inactive')}>
                {c.image_url ? (
                  <img src={c.image_url} alt="" className="admin-pill__img" />
                ) : (
                  <span className="admin-pill__img admin-pill__img--empty" />
                )}
                <span>{c.name}</span>
                <button className="admin-pill__action" onClick={() => setEditingCat(c)}>
                  Edit
                </button>
                <button className="admin-pill__action admin-pill__action--danger" onClick={() => onDeleteCat(c)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---- Items ---- */}
      <section className="admin-section">
        <div className="admin-section__head">
          <h2>Items</h2>
          <button className="admin-btn admin-btn--primary admin-btn--sm" onClick={() => setEditingProduct('new')}>
            + Add Item
          </button>
        </div>

        {products.length === 0 ? (
          <p className="admin-empty">No items yet.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>Category</th>
                <th>MRP</th>
                <th>Retail</th>
                <th>GST%</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className={p.is_active ? '' : 'is-inactive'}>
                  <td className="admin-table__thumb">
                    {p.image_url ? <img src={p.image_url} alt="" /> : <span>—</span>}
                  </td>
                  <td data-label="Name">{p.name}</td>
                  <td data-label="Category">{catName(p.shop_category_id) ?? <em>—</em>}</td>
                  <td data-label="MRP">₹{p.mrp}</td>
                  <td data-label="Retail">₹{p.retail_price}</td>
                  <td data-label="GST%">{p.gst_percent}%</td>
                  <td data-label="Status">{p.is_active ? 'Active' : <span className="admin-tag admin-tag--muted">Inactive</span>}</td>
                  <td className="admin-table__actions">
                    <button className="admin-btn admin-btn--sm admin-btn--ghost" onClick={() => setEditingProduct(p)}>
                      Edit
                    </button>
                    <button className="admin-btn admin-btn--sm admin-btn--danger" onClick={() => onDeleteProduct(p)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {editingCat && (
        <ShopCategoryFormModal
          shopId={shopId}
          shopCategory={editingCat === 'new' ? null : editingCat}
          onClose={() => setEditingCat(null)}
          onSaved={() => {
            setEditingCat(null);
            load();
          }}
        />
      )}

      {editingProduct && (
        <ShopProductFormModal
          shopId={shopId}
          shopCategories={shopCategories}
          product={editingProduct === 'new' ? null : editingProduct}
          onClose={() => setEditingProduct(null)}
          onSaved={() => {
            setEditingProduct(null);
            load();
          }}
        />
      )}
    </div>
  );
}
