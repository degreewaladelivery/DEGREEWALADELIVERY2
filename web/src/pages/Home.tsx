import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchCategories, fetchShops, fetchCategoryItemCounts } from '../lib/catalog';
import type { Category, Shop } from '@shared/types';
import { categoryPalette } from '@shared/tokens';
import { Button } from '../components/ui/Button';
import { CategoryCard } from '../components/cards/CategoryCard';
import { ShopCard } from '../components/cards/ShopCard';
import { Thumb } from '../components/ui/Thumb';
import {
  GridIcon, TruckIcon, AwardIcon, LockIcon,
  LeafIcon, CoffeeIcon, SparklesIcon, GiftIcon, CalendarIcon,
  BuildingIcon, UsersIcon, StoreIcon, BagIcon,
  TagIcon, CreditCardIcon, MapPinIcon, HeadphonesIcon, SearchIcon,
  MicIcon, ZapIcon, SlidersIcon, BookmarkIcon, PercentCircleIcon,
} from '../components/ui/icons';
import { getBrandImage, getCategoryImage, getShopImage } from '../lib/images';
import { useLocationStore } from '../store/locationStore';
import { fetchHomeBanner, type HomeBanner } from '@shared/homeBanner';
import { supabase } from '../lib/supabase';
import { LocationModal } from '../components/ui/LocationModal';
import './Home.css';

const POPULAR_SEARCHES = [
  { label: 'Food', to: '/category/food' },
  { label: 'Grocery', to: '/category/grocery' },
  { label: 'Medicine', to: '/category/medical' },
  { label: 'Cakes', to: '/category/bakery' },
  { label: 'Meat', to: '/category/meat' },
];

const MX_OFFERS = [
  '₹75 OFF above ₹199',
  '40% OFF up to ₹120',
  '₹150 OFF above ₹499',
  '50% OFF on select items',
  'FREE DELIVERY',
  '30% OFF up to ₹80',
  '₹100 OFF above ₹349',
  'Buy 1 Get 1',
];

const MX_VOTES = ['By 8.3K+', 'By 2.1K+', 'By 950+', 'By 1.4K+'];

const HERO_BADGES = [
  { Icon: GridIcon, title: 'Wide Range', sub: 'of Categories' },
  { Icon: TruckIcon, title: 'Fast Delivery', sub: 'at Your Doorstep' },
  { Icon: AwardIcon, title: 'Best Quality', sub: 'Guaranteed' },
  { Icon: LockIcon, title: 'Easy & Secure', sub: 'Payments' },
];

const STATS = [
  { Icon: BuildingIcon, value: '3+', label: 'Cities', sub: 'Available in multiple cities' },
  { Icon: UsersIcon, value: '1000+', label: 'Happy Customers', sub: 'Joined the family' },
  { Icon: StoreIcon, value: '61+', label: 'Shops', sub: 'Partnered with us' },
  { Icon: BagIcon, value: '1000+', label: 'Products', sub: 'Wide quality range' },
];

const WHY_CHOOSE = [
  { Icon: LeafIcon, title: 'Healthy & Hygienic' },
  { Icon: TruckIcon, title: 'Easy Mode of Delivery' },
  { Icon: CoffeeIcon, title: 'Gourmet Options' },
  { Icon: SparklesIcon, title: 'Plan a Party' },
  { Icon: GiftIcon, title: 'Gift Cards Collection' },
  { Icon: CalendarIcon, title: 'Schedule Your Order' },
];

const APP_FEATURES = [
  { Icon: TagIcon, title: 'Exclusive Offers' },
  { Icon: CreditCardIcon, title: 'Easy Payments' },
  { Icon: MapPinIcon, title: 'Live Order Tracking' },
  { Icon: HeadphonesIcon, title: 'Quick Support' },
];

export function Home() {
  const location = useLocationStore((s) => s.location);
  const [locationOpen, setLocationOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [banner, setBanner] = useState<HomeBanner | null>(null);
  const navigate = useNavigate();
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
    fetchShops().then(setShops).catch(() => {});
    fetchCategoryItemCounts().then(setItemCounts).catch(() => {});
    fetchHomeBanner(supabase).then(setBanner).catch(() => {});
  }, []);

  const featuredShops = shops.filter((s) => s.isFeatured);

  // An uploaded banner wins; otherwise the picture bundled with the build, so
  // the page is never blank before anyone has set one.
  const bundledHero = getBrandImage('hero');
  const heroArt = banner?.imageUrl ?? bundledHero;
  const heroVisible = banner ? banner.isActive && Boolean(heroArt) : Boolean(heroArt);
  const heroCategory = banner?.ctaCategoryId
    ? categories.find((c) => c.id === banner.ctaCategoryId)
    : undefined;
  const appPhone = getBrandImage('app-phone');

  const scrollRail = (dir: number) => {
    railRef.current?.scrollBy({ left: dir * 380, behavior: 'smooth' });
  };

  return (
    <div className="home">

      <section className="mx" aria-label="Explore">

        <div className="container mx-top">
          <button type="button" className="mx-loc" onClick={() => setLocationOpen(true)}>
            <span className="mx-loc__pin"><MapPinIcon size={20} /></span>
            <span className="mx-loc__text">
              <strong>{location ? `${location.label} ▾` : 'Set your location ▾'}</strong>
              <small>{location ? location.address : 'Tap to tell us where to deliver'}</small>
            </span>
          </button>
          <span className="mx-avatar" aria-label="Account">A</span>
        </div>

        <div className="mx-searchbar">
          <div className="container mx-searchbar__row">
            <form
              className="mx-search"
              onSubmit={(e) => {
                e.preventDefault();
                if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
              }}
            >
              <span className="mx-search__icon"><SearchIcon size={18} /></span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for food, grocery, medicine…"
                aria-label="Search"
              />
              <span className="mx-search__mic"><MicIcon size={17} /></span>
            </form>
          </div>
        </div>

        {heroVisible && (
          <div className="mx-banner">
            <img src={heroArt} alt="" />
            {heroCategory && (
              <Link to={`/category/${heroCategory.key}`} className="mx-banner__cta">
                ORDER NOW ›
              </Link>
            )}
          </div>
        )}

        <div className="container mx-filters">
          <button type="button" className="mx-pill"><SlidersIcon size={14} /> Filters ▾</button>
          <button type="button" className="mx-pill"><span className="mx-bolt"><ZapIcon size={13} /></span> Near &amp; Fast</button>
          <button type="button" className="mx-pill">No packaging charges</button>
        </div>

        <div className="container mx-reco">
          <h2 className="mx-heading">Recommended for you</h2>
          <div className="mx-reco__rail">
            {categories.map((c, i) => (
              <Link key={c.id} to={`/category/${c.key}`} className="mx-reco-card">
                <span className="mx-reco-card__img">
                  <Thumb src={c.imageUrl ?? getCategoryImage(c.key)} emoji={c.emoji} tint={c.tint} color={c.color} alt={c.name} fontSize={40} />
                  {c.key === 'food' && (
                    <span className="mx-reco-card__offer">{MX_OFFERS[i % MX_OFFERS.length]}</span>
                  )}
                </span>
                <strong className="mx-reco-card__name">{c.name}</strong>
                <span className="mx-fast"><ZapIcon size={12} /> {itemCounts[c.id] ?? 0} item{(itemCounts[c.id] ?? 0) === 1 ? '' : 's'}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="container mx-feed">
          <h2 className="mx-heading">{shops.length} shops delivering to you</h2>
          <p className="mx-subheading">Featured</p>
          {featuredShops.map((s, i) => {
            const pal = categoryPalette[s.categoryKey];
            return (
              <Link key={s.id} to={`/shop/${s.id}`} className="mx-feat">
                <span className="mx-feat__img">
                  <Thumb src={s.imageUrl ?? getShopImage(s.id)} emoji={pal.emoji} tint={pal.tint} color={pal.border} alt={s.name} fontSize={64} />
                  <span className="mx-feat__bookmark"><BookmarkIcon size={20} /></span>
                  <span className="mx-feat__dots">
                    {Array.from({ length: 6 }).map((_, d) => (
                      <span key={d} className={'mx-feat__dot' + (d === 0 ? ' is-on' : '')} />
                    ))}
                  </span>
                </span>
                <span className="mx-feat__body">
                  <span className="mx-feat__row">
                    <strong className="mx-feat__name">{s.name}</strong>
                    <span className="mx-feat__rating">
                      <span className="mx-feat__rating-pill">★ {s.rating.toFixed(1)}</span>
                      <small>{MX_VOTES[i % MX_VOTES.length]}</small>
                    </span>
                  </span>
                  <span className="mx-fast"><ZapIcon size={12} /> Near &amp; Fast</span>
                  <span className="mx-feat__divider" />
                  <span className="mx-feat__offer">
                    <span className="mx-feat__offer-icon"><PercentCircleIcon size={17} /></span>
                    {MX_OFFERS[(i + 3) % MX_OFFERS.length]}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="hero dt-only">
        <div className="container hero__inner">
          <div className="hero__left">
            <p className="hero__welcome">Welcome to</p>
            <h1 className="hero__title">
              Degree<span className="hero__title-accent">Wala</span>
            </h1>
            <p className="hero__sub">
              Order food, groceries, medicine, bakery and more from your
              favourite local shops — delivered fast, right to your door.
            </p>

            <form
              className="hero__search"
              onSubmit={(e) => {
                e.preventDefault();
                if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
              }}
            >
              <span className="hero__search-icon"><SearchIcon size={18} /></span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for food, grocery, salon, cakes…"
                aria-label="Search"
              />
              <Button type="submit" size="md">Search</Button>
            </form>

            <div className="hero__popular">
              <span>Popular:</span>
              {POPULAR_SEARCHES.map((p) => (
                <Link key={p.label} to={p.to} className="chip">{p.label}</Link>
              ))}
            </div>

            <div className="hero__badges">
              {HERO_BADGES.map((b) => (
                <div key={b.title} className="hero__badge">
                  <span className="hero__badge-icon">
                    <b.Icon />
                  </span>
                  <div>
                    <strong>{b.title}</strong>
                    <small>{b.sub}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="hero__right">
            {/* The desktop marketing illustration, not the banner — it sits in a
                tall slot a wide uploaded banner would distort. */}
            {bundledHero ? (
              <img className="hero__img" src={bundledHero} alt="Degreewala delivery" />
            ) : (
              <div className="hero__art">
                <span className="hero__art-scooter">🛵</span>
                <span className="hero__art-pin">📍</span>
                <div className="hero__art-chip hero__art-chip--1">🍔 Food</div>
                <div className="hero__art-chip hero__art-chip--2">🛒 Grocery</div>
                <div className="hero__art-chip hero__art-chip--3">💊 Medicine</div>
                <div className="hero__art-card">
                  <strong>Order in 2 mins</strong>
                  <small>Fast &amp; reliable delivery</small>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="section dt-only" id="categories">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">Browse by need</span>
            <h2>Top Categories</h2>
            <div className="underline" />
          </div>

          <div className="carousel">
            <button className="carousel__arrow" onClick={() => scrollRail(-1)} aria-label="Scroll left">‹</button>
            <div className="carousel__rail" ref={railRef}>
              {categories.map((cat) => (
                <div className="carousel__item" key={cat.id}>
                  <CategoryCard category={cat} count={itemCounts[cat.id] ?? 0} />
                </div>
              ))}
            </div>
            <button className="carousel__arrow" onClick={() => scrollRail(1)} aria-label="Scroll right">›</button>
          </div>
        </div>
      </section>

      <section className="section dt-only" id="offers">
        <div className="container">
          <div className="featured-panel">
            <div className="featured-panel__intro">
              <span className="eyebrow-light">Featured</span>
              <h2 className="featured-panel__title">Popular Near You</h2>
              <p className="featured-panel__desc">
                Hand-picked shops your neighbours love — top-rated and ready to deliver.
              </p>
              <Link to="/category/food" className="btn btn-light btn-md featured-panel__cta">
                Shop Now →
              </Link>
            </div>

            <div className="featured-panel__shops">
              <div className="featured-panel__head">
                <span>Top rated near you</span>
                <Link to="/category/food" className="featured-panel__all">View All Shops →</Link>
              </div>
              <div className="featured-panel__row">
                {featuredShops.map((shop) => (
                  <div className="featured-panel__shop" key={shop.id}>
                    <ShopCard shop={shop} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section stats-section dt-only">
        <div className="container">
          <div className="stats-card">
            {STATS.map((s) => (
              <div key={s.label} className="stat">
                <span className="stat__icon"><s.Icon size={26} /></span>
                <div className="stat__text">
                  <span className="stat__value">{s.value}</span>
                  <strong className="stat__label">{s.label}</strong>
                  <small className="stat__sub">{s.sub}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section dt-only">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">Our promise</span>
            <h2>Why Choose DegreeWala?</h2>
            <div className="underline" />
          </div>
          <div className="why-row">
            {WHY_CHOOSE.map((w) => (
              <div key={w.title} className="why">
                <span className="why__icon"><w.Icon size={30} /></span>
                <span className="why__title">{w.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section dt-only">
        <div className="container">
          <div className="app-cta">
            <div className="app-cta__left">
              <h2 className="app-cta__title">What’s waiting for you on the app?</h2>
              <p className="app-cta__sub">Schedule your order today and never miss a deal.</p>
              <div className="app-cta__stores">
                <span className="store-pill">▶ Google Play</span>
                <span className="store-pill"> App Store</span>
              </div>
            </div>

            <div className="app-cta__phone">
              {appPhone ? (
                <img className="app-cta__phone-img" src={appPhone} alt="Degreewala app" />
              ) : (
                <div className="phone">
                  <div className="phone__notch" />
                  <div className="phone__screen">
                    <div className="phone__bar">Degree<span>Wala</span></div>
                    <div className="phone__search">🔍 Search…</div>
                    <div className="phone__grid">
                      {categories.slice(0, 6).map((c) => (
                        <div key={c.id} className="phone__tile" style={{ background: c.tint }}>
                          <span>{c.emoji}</span>
                          {c.name}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="app-cta__features">
              {APP_FEATURES.map((f) => (
                <div key={f.title} className="app-feature">
                  <span className="app-feature__icon"><f.Icon size={20} /></span>
                  {f.title}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {locationOpen && <LocationModal onClose={() => setLocationOpen(false)} />}
    </div>
  );
}
