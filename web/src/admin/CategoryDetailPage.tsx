import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  listCategories,
  listSubcategories,
  listProducts,
  listShops,
  deleteSubcategory,
  deleteProduct,
} from './api';
import type { CategoryRow, SubcategoryRow, ProductRow, ShopRow } from './types';
import { SubcategoryFormModal } from './SubcategoryFormModal';
import { ProductFormModal } from './ProductFormModal';

export function CategoryDetailPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [category, setCategory] = useState<CategoryRow | null>(null);
  const [subcategories, setSubcategories] = useState<SubcategoryRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [editingSub, setEditingSub] = useState<SubcategoryRow | null | 'new'>(null);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null | 'new'>(null);

  const load = useCallback(() => {
    if (!categoryId) return;
    listCategories()
      .then((cats) => setCategory(cats.find((c) => c.id === categoryId) ?? null))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load category'));
    listSubcategories(categoryId).then(setSubcategories).catch(() => {});
    listProducts(categoryId).then(setProducts).catch(() => {});
    listShops().then(setShops).catch(() => {});
  }, [categoryId]);

  useEffect(load, [load]);

  if (!categoryId) return null;

  const onDeleteSub = async (sub: SubcategoryRow) => {
    if (!confirm(`Delete subcategory "${sub.name}"? Its items move to "no subcategory".`)) return;
    await deleteSubcategory(sub.id);
    load();
  };

  const onDeleteProduct = async (p: ProductRow) => {
    if (!confirm(`Delete item "${p.name}"?`)) return;
    await deleteProduct(p.id);
    load();
  };

  const subName = (id: string | null) =>
    id ? subcategories.find((s) => s.id === id)?.name ?? '—' : null;

  return (
    <div>
      <Link to="/admin/categories" className="admin-back">
        ‹ All categories
      </Link>
      <div className="admin-page__head">
        <h1>{category?.name ?? '…'}</h1>
      </div>

      {error && <p className="admin-login__error">{error}</p>}

      {/* ---- Subcategories ---- */}
      <section className="admin-section">
        <div className="admin-section__head">
          <h2>Subcategories</h2>
          <button className="admin-btn admin-btn--sm" onClick={() => setEditingSub('new')}>
            + Add Subcategory
          </button>
        </div>
        {subcategories.length === 0 ? (
          <p className="admin-empty">
            No subcategories — items added below will show directly under this category.
          </p>
        ) : (
          <div className="admin-pills">
            {subcategories.map((s) => (
              <div key={s.id} className={'admin-pill' + (s.is_active ? '' : ' is-inactive')}>
                {s.image_url ? (
                  <img src={s.image_url} alt="" className="admin-pill__img" />
                ) : (
                  <span className="admin-pill__img admin-pill__img--empty" />
                )}
                <span>{s.name}</span>
                <button className="admin-pill__action" onClick={() => setEditingSub(s)}>
                  Edit
                </button>
                <button className="admin-pill__action admin-pill__action--danger" onClick={() => onDeleteSub(s)}>
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
                <th>Subcategory</th>
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
                  <td data-label="Subcategory">{subName(p.subcategory_id) ?? <em>—</em>}</td>
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

      {editingSub && (
        <SubcategoryFormModal
          categoryId={categoryId}
          subcategory={editingSub === 'new' ? null : editingSub}
          onClose={() => setEditingSub(null)}
          onSaved={() => {
            setEditingSub(null);
            load();
          }}
        />
      )}

      {editingProduct && (
        <ProductFormModal
          categoryId={categoryId}
          subcategories={subcategories}
          shops={shops}
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
