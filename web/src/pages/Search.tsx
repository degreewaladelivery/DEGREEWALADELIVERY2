import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Product } from '@shared/types';
import { searchProducts } from '../lib/catalog';
import { ProductCard } from '../components/cards/ProductCard';
import { SearchIcon } from '../components/ui/icons';
import { Button } from '../components/ui/Button';
import './Search.css';

const SUGGESTIONS = ['Rice', 'Oil', 'Masala', 'Milk', 'Pen'];

export function Search() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const [state, setState] = useState<{ query: string; items: Product[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;

    let cancelled = false;
    searchProducts(term)
      .then((items) => {
        if (!cancelled) {
          setState({ query, items });
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Search failed');
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  const tooShort = query.trim().length < 2;
  const loading = !tooShort && state?.query !== query && !error;
  const results = state?.query === query ? state.items : [];

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get('q') ?? '').trim();
    setParams(value ? { q: value } : {});
  };

  return (
    <div className="container search-page">
      <form className="search-page__form" onSubmit={onSubmit}>
        <span className="search-page__icon">
          <SearchIcon size={18} />
        </span>
        <input
          key={query}
          name="q"
          defaultValue={query}
          placeholder="Search for food, grocery, medicine…"
          aria-label="Search items"
          autoFocus
        />
        <Button type="submit" size="md">
          Search
        </Button>
      </form>

      {tooShort ? (
        <>
          <p className="search-page__hint">Type at least 2 letters to search.</p>
          <div className="search-page__chips">
            {SUGGESTIONS.map((s) => (
              <Link key={s} to={`/search?q=${encodeURIComponent(s)}`} className="chip">
                {s}
              </Link>
            ))}
          </div>
        </>
      ) : (
        <>
          <h1 className="search-page__heading">
            {loading ? 'Searching…' : `${results.length} result${results.length === 1 ? '' : 's'} for “${query}”`}
          </h1>

          {error && <p className="search-page__error">{error}</p>}

          {!loading && !error && results.length === 0 && (
            <div className="search-page__empty">
              <span className="search-page__empty-icon">🔍</span>
              <p>Nothing matched “{query}”.</p>
              <p className="search-page__hint">Try a shorter word, or browse categories from home.</p>
              <Link to="/" className="btn btn-primary btn-lg">Browse categories</Link>
            </div>
          )}

          {results.length > 0 && (
            <div className="search-page__results">
              {results.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
