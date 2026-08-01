import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  listShops,
  listShopCategories,
  listShopProducts,
  listProductsLinkedToShop,
  listCategories,
  deleteShopCategory,
  deleteShopProduct,
  bulkUpsertShopProducts,
} from './api';
import type { ShopRow, ShopCategoryRow, ShopProductRow, ProductRow, CategoryRow } from './types';
import { ShopCategoryFormModal } from './ShopCategoryFormModal';
import { ShopProductFormModal } from './ShopProductFormModal';
import { BulkUploadModal } from './BulkUploadModal';

export function ShopDetailPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const [shop, setShop] = useState<ShopRow | null>(null);
  const [shopCategories, setShopCategories] = useState<ShopCategoryRow[]>([]);
  const [products, setProducts] = useState<ShopProductRow[]>([]);
  const [linkedProducts, setLinkedProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [editingCat, setEditingCat] = useState<ShopCategoryRow | null | 'new'>(null);
  const [editingProduct, setEditingProduct] = useState<ShopProductRow | null | 'new'>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const load = useCallback(() => {
    if (!shopId) return;
    listShops()
      .then((shops) => setShop(shops.find((s) => s.id === shopId) ?? null))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load shop'));
    listShopCategories(shopId).then(setShopCategories).catch(() => {});
    listShopProducts(shopId).then(setProducts).catch(() => {});
    listProductsLinkedToShop(shopId).then(setLinkedProducts).catch(() => {});
    listCategories().then(setCategories).catch(() => {});
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

  const parentCategoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? '—';

  const nextSerial = products.length ? Math.max(...products.map((p) => p.serial_no)) + 1 : 1;

  return (
    <div>
      <Link to="/admin/shops" className="admin-back">
        ‹ All shops
      </Link>
      <div className="admin-page__head">
        <h1>{shop?.name ?? '…'}</h1>
      </div>

      {error && <p className="admin-login__error">{error}</p>}

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

      <section className="admin-section">
        <div className="admin-section__head">
          <h2>Items</h2>
          <div className="admin-table__actions">
            <button className="admin-btn admin-btn--sm" onClick={() => setBulkOpen(true)}>
              ↑ Bulk Upload
            </button>
            <button className="admin-btn admin-btn--primary admin-btn--sm" onClick={() => setEditingProduct('new')}>
              + Add Item
            </button>
          </div>
        </div>

        {products.length === 0 ? (
          <p className="admin-empty">No items yet.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
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
                  <td data-label="#" className="admin-table__serial">{p.serial_no}</td>
                  <td className="admin-table__thumb">
                    {p.image_url ? <img src={p.image_url} alt="" /> : <span>—</span>}
                  </td>
                  <td data-label="Name">
                    {p.name}
                    {p.unit && <span className="admin-item-unit">{p.unit}</span>}
                  </td>
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

      {linkedProducts.length > 0 && (
        <section className="admin-section">
          <div className="admin-section__head">
            <h2>Also shown here</h2>
          </div>
          <p className="admin-empty" style={{ paddingTop: 0 }}>
            These items live in the Categories tab and were linked to this shop. Edit or remove them
            from their category.
          </p>
          <table className="admin-table">
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>Shop category</th>
                <th>From category</th>
                <th>MRP</th>
                <th>Retail</th>
                <th>GST%</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {linkedProducts.map((p) => (
                <tr key={p.id} className={p.is_active ? '' : 'is-inactive'}>
                  <td className="admin-table__thumb">
                    {p.image_url ? <img src={p.image_url} alt="" /> : <span>—</span>}
                  </td>
                  <td data-label="Name">{p.name}</td>
                  <td data-label="Shop category">{catName(p.shop_category_id) ?? <em>—</em>}</td>
                  <td data-label="From category">
                    <Link to={`/admin/categories/${p.category_id}`}>{parentCategoryName(p.category_id)}</Link>
                  </td>
                  <td data-label="MRP">₹{p.mrp}</td>
                  <td data-label="Retail">₹{p.retail_price}</td>
                  <td data-label="GST%">{p.gst_percent}%</td>
                  <td data-label="Status">{p.is_active ? 'Active' : <span className="admin-tag admin-tag--muted">Inactive</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {bulkOpen && (
        <BulkUploadModal
          groupLabel="Shop category"
          templateFileName={`${shop?.name ?? 'items'}-template.csv`}
          onImport={(rows) => bulkUpsertShopProducts(shopId, rows, shopCategories)}
          onClose={() => setBulkOpen(false)}
          onImported={load}
        />
      )}

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
          nextSerial={nextSerial}
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
