import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { listCategories, listSubcategories, listShops, deleteSubcategory } from './api';
import type { CategoryRow, SubcategoryRow, ShopRow } from './types';
import { SubcategoryFormModal } from './SubcategoryFormModal';

export function CategoryDetailPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [category, setCategory] = useState<CategoryRow | null>(null);
  const [subcategories, setSubcategories] = useState<SubcategoryRow[]>([]);
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [editingSub, setEditingSub] = useState<SubcategoryRow | null | 'new'>(null);

  const load = useCallback(() => {
    if (!categoryId) return;
    listCategories()
      .then((cats) => setCategory(cats.find((c) => c.id === categoryId) ?? null))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load category'));
    listSubcategories(categoryId).then(setSubcategories).catch(() => {});
    listShops()
      .then((all) => setShops(all.filter((s) => s.category_id === categoryId)))
      .catch(() => {});
  }, [categoryId]);

  useEffect(load, [load]);

  if (!categoryId) return null;

  const onDeleteSub = async (sub: SubcategoryRow) => {
    if (!confirm(`Delete subcategory "${sub.name}"? Shops tagged with it become untagged.`)) return;
    await deleteSubcategory(sub.id);
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

      {/* ---- Subcategories (classify shops within this category) ---- */}
      <section className="admin-section">
        <div className="admin-section__head">
          <h2>Subcategories</h2>
          <button className="admin-btn admin-btn--sm" onClick={() => setEditingSub('new')}>
            + Add Subcategory
          </button>
        </div>
        {subcategories.length === 0 ? (
          <p className="admin-empty">
            No subcategories — e.g. add "Veg" / "Non-Veg" to tag shops in this category.
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

      {/* ---- Shops in this category ---- */}
      <section className="admin-section">
        <div className="admin-section__head">
          <h2>Shops</h2>
          <Link to="/admin/shops" className="admin-btn admin-btn--sm">
            + Add Shop
          </Link>
        </div>
        {shops.length === 0 ? (
          <p className="admin-empty">No shops in this category yet.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>Subcategory</th>
                <th>Rating</th>
                <th>Delivery</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shops.map((s) => (
                <tr key={s.id} className={s.is_active ? '' : 'is-inactive'}>
                  <td className="admin-table__thumb">
                    {s.image_url ? <img src={s.image_url} alt="" /> : <span>—</span>}
                  </td>
                  <td>{s.name}</td>
                  <td>{subName(s.subcategory_id) ?? <em>—</em>}</td>
                  <td>{s.rating > 0 ? `★ ${s.rating.toFixed(1)}` : '—'}</td>
                  <td>{s.delivery_time ?? '—'}</td>
                  <td>{s.is_active ? 'Active' : <span className="admin-tag admin-tag--muted">Inactive</span>}</td>
                  <td className="admin-table__actions">
                    <Link to={`/admin/shops/${s.id}`} className="admin-btn admin-btn--sm admin-btn--ghost">
                      Open
                    </Link>
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
    </div>
  );
}
