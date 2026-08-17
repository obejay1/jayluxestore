'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  LoaderCircle,
  RefreshCw,
  Search,
  SlidersHorizontal,
  ShoppingBag,
  X,
} from 'lucide-react';

import Footer from '@/components/Footer';
import PageHeroIcon from '@/components/PageHeroIcon';
import ProductCard from '@/components/ProductCard';
import { getCategories, getProducts } from '@/lib/store';
import type { Category, Product } from '@/lib/types';
import { PRODUCT_GRID_CLASSES, PRODUCT_SECTION_SHELL_CLASS } from '@/lib/layoutClasses';

const ITEMS_PER_PAGE = 12;

const QuickViewModal = dynamic(() => import('@/components/QuickViewModal'), {
  ssr: false,
  loading: () => <div className="jl-modal-loading" role="status">Opening quick view…</div>,
});

const collectionLabels: Record<string, { eyebrow: string; title: string; description: string }> = {
  sale: {
    eyebrow: 'Limited-Time Offers',
    title: 'Flash Sale',
    description: 'Discover selected JayLuxe pieces with special pricing while availability lasts.',
  },
  featured: {
    eyebrow: 'Curated by JayLuxe',
    title: 'Featured Products',
    description: 'Explore standout fashion, beauty and lifestyle pieces selected by the JayLuxe team.',
  },
  new: {
    eyebrow: 'Just Arrived',
    title: 'New Arrivals',
    description: 'Be among the first to discover the newest additions to the JayLuxe collection.',
  },
  bestsellers: {
    eyebrow: 'Client Favourites',
    title: 'Best Sellers',
    description: 'Shop popular JayLuxe products chosen again and again by our customers.',
  },
};

type LoadState = 'loading' | 'ready' | 'error';

function normalize(value?: string) {
  return String(value || '').trim().toLocaleLowerCase();
}

function ShopSkeleton() {
  return (
    <main className="jl-shop-page">
      <section className="jl-shop-hero">
        <div className="jl-shop-hero-content">
          <PageHeroIcon icon={ShoppingBag} label="Shop JayLuxe" />
          <span className="jl-shop-badge">The JayLuxe Collection</span>
          <h1 className="font-serif">Elegance in Every Detail</h1>
          <p>Discover a refined edit of fashion, beauty, hair, fragrance and lifestyle essentials.</p>
        </div>
      </section>
      <section className="jl-shop-section" aria-busy="true" aria-label="Loading products">
        <div className="jl-shop-loading-heading">
          <LoaderCircle className="jl-spin" size={26} /> Loading the collection…
        </div>
        <div className={`jl-shop-grid ${PRODUCT_GRID_CLASSES}`}>
          {Array.from({ length: 8 }).map((_, index) => (
            <div className="jl-product-skeleton" key={index} aria-hidden="true">
              <div />
              <span />
              <span />
              <button tabIndex={-1} />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function ShopContent() {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [collectionFilter, setCollectionFilter] = useState('all');
  const [maxPrice, setMaxPrice] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  const loadCatalog = useCallback(async () => {
    setLoadState('loading');
    setLoadError('');

    try {
      const [productResult, categoryResult] = await Promise.allSettled([
        getProducts(),
        getCategories(),
      ]);

      if (productResult.status === 'rejected') {
        throw productResult.reason;
      }

      const activeProducts = productResult.value.filter(
        (product) => product.type !== 'service' && product.active !== false,
      );
      const highestPrice = Math.max(
        1000,
        ...activeProducts.map((product) => Number(product.price || 0)),
      );

      setProducts(activeProducts);
      setMaxPrice(highestPrice);
      setCategories(
        categoryResult.status === 'fulfilled'
          ? categoryResult.value.filter(
              (category) => category.type !== 'service' && category.active !== false,
            )
          : [],
      );
      setLoadState('ready');
    } catch (error) {
      console.error('Failed to load shop catalog:', error);
      setProducts([]);
      setLoadState('error');
      setLoadError(
        'We could not load the JayLuxe collection. Check your connection and try again.',
      );
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    const params = new URLSearchParams(queryString);
    setActiveCategory(params.get('category')?.trim() || 'All');
    setSearchQuery(params.get('q')?.trim() || '');
    setCollectionFilter(params.get('collection')?.trim().toLowerCase() || 'all');
    setSortBy(params.get('sort')?.trim() || 'newest');
  }, [queryString]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeCategory, sortBy, maxPrice, inStockOnly, featuredOnly, collectionFilter]);

  const absoluteMaxPrice = useMemo(
    () => Math.max(1000, ...products.map((product) => Number(product.price || 0))),
    [products],
  );

  const allCategories = useMemo(() => {
    const names = new Map<string, string>();

    categories.forEach((category) => names.set(normalize(category.name), category.name));
    products.forEach((product) => {
      if (product.category) names.set(normalize(product.category), product.category.trim());
    });

    return ['All', ...Array.from(names.values()).sort((a, b) => a.localeCompare(b))];
  }, [categories, products]);

  const filteredAndSortedProducts = useMemo(() => {
    const query = normalize(searchQuery);
    const category = normalize(activeCategory);

    const filtered = products.filter((product) => {
      if (activeCategory !== 'All' && normalize(product.category) !== category) return false;
      if (maxPrice > 0 && Number(product.price || 0) > maxPrice) return false;
      if (inStockOnly && Number(product.stock ?? 1) <= 0) return false;
      if (featuredOnly && !product.featured && !product.bestseller) return false;
      if (collectionFilter === 'sale' && !(Number(product.oldPrice || 0) > Number(product.price || 0) || Number(product.discount || 0) > 0)) return false;
      if (collectionFilter === 'featured' && !product.featured) return false;
      if (collectionFilter === 'new' && !product.isNew) return false;
      if (collectionFilter === 'bestsellers' && !product.bestseller) return false;

      if (query) {
        const searchable = [product.name, product.category, product.description]
          .map(normalize)
          .join(' ');
        if (!searchable.includes(query)) return false;
      }

      return true;
    });

    return [...filtered].sort((first, second) => {
      if (sortBy === 'price-asc') return first.price - second.price;
      if (sortBy === 'price-desc') return second.price - first.price;
      if (sortBy === 'name') return first.name.localeCompare(second.name);
      return (
        Number(Boolean(second.isNew || second.featured)) -
          Number(Boolean(first.isNew || first.featured)) ||
        first.name.localeCompare(second.name)
      );
    });
  }, [products, searchQuery, activeCategory, sortBy, maxPrice, inStockOnly, featuredOnly, collectionFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSortedProducts.length / ITEMS_PER_PAGE),
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAndSortedProducts, currentPage]);

  const suggestions = useMemo(() => {
    const query = normalize(searchQuery);
    if (!query) return [];

    return products
      .filter(
        (product) =>
          normalize(product.name).includes(query) ||
          normalize(product.category).includes(query),
      )
      .slice(0, 5);
  }, [products, searchQuery]);

  const hasFilters =
    Boolean(searchQuery) ||
    activeCategory !== 'All' ||
    inStockOnly ||
    featuredOnly ||
    (maxPrice > 0 && maxPrice < absoluteMaxPrice) ||
    collectionFilter !== 'all';

  function clearFilters() {
    setActiveCategory('All');
    setMaxPrice(absoluteMaxPrice);
    setInStockOnly(false);
    setFeaturedOnly(false);
    setSearchQuery('');
    setSortBy('newest');
    setCollectionFilter('all');
  }

  const collectionMeta = collectionLabels[collectionFilter] || {
    eyebrow: 'The JayLuxe Collection',
    title: 'Elegance in Every Detail',
    description: 'Discover a refined edit of fashion, beauty, hair, fragrance and lifestyle essentials selected for modern luxury.',
  };

  return (
    <main className="jl-shop-page">
      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      )}

      <section className="jl-shop-hero">
        <div className="jl-shop-hero-content">
          <PageHeroIcon icon={ShoppingBag} label="Shop JayLuxe" />
          <span className="jl-shop-badge">{collectionMeta.eyebrow}</span>
          <h1 className="font-serif">{collectionMeta.title}</h1>
          <p>{collectionMeta.description}</p>
        </div>
      </section>

      <section className="jl-shop-toolbar" aria-label="Shop controls">
        <div className="jl-shop-search-panel">
          <Search size={20} aria-hidden="true" />
          <label className="sr-only" htmlFor="shop-search">Search products</label>
          <input
            id="shop-search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => window.setTimeout(() => setSearchFocused(false), 150)}
            placeholder="Search by product, category or benefit"
            autoComplete="off"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search">
              <X size={18} />
            </button>
          )}
          {searchFocused && suggestions.length > 0 && (
            <div className="jl-search-suggestions">
              {suggestions.map((item) => (
                <Link href={`/product/${item.id}`} key={item.id}>
                  <span>{item.name}</span>
                  <small>{item.category || 'JayLuxe Collection'}</small>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="jl-shop-controls">
          <button
            type="button"
            className="jl-filter-toggle"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-controls="shop-filter-panel"
          >
            <SlidersHorizontal size={18} /> Filters
          </button>

          <div className="jl-shop-categories" aria-label="Product categories">
            {allCategories.map((category) => (
              <button
                type="button"
                key={category}
                className={normalize(activeCategory) === normalize(category) ? 'active' : ''}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="jl-shop-sorting">
            <label htmlFor="sort-by">Sort by</label>
            <div className="select-wrapper">
              <select id="sort-by" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="newest">Newest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name">Name: A–Z</option>
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </div>
          </div>
        </div>

        <div id="shop-filter-panel" className={`jl-shop-filter-drawer${filtersOpen ? ' open' : ''}`}>
          <div className="jl-filter-group">
            <div>
              <strong>Maximum price</strong>
              <span>₦{Math.min(maxPrice || absoluteMaxPrice, absoluteMaxPrice).toLocaleString('en-NG')}</span>
            </div>
            <input
              type="range"
              min="0"
              max={absoluteMaxPrice}
              step="1000"
              value={Math.min(maxPrice || absoluteMaxPrice, absoluteMaxPrice)}
              onChange={(event) => setMaxPrice(Number(event.target.value))}
              aria-label="Maximum product price"
            />
          </div>
          <label className="jl-filter-check">
            <input type="checkbox" checked={inStockOnly} onChange={(event) => setInStockOnly(event.target.checked)} />
            In-stock products only
          </label>
          <label className="jl-filter-check">
            <input type="checkbox" checked={featuredOnly} onChange={(event) => setFeaturedOnly(event.target.checked)} />
            Featured and bestselling
          </label>
          <button type="button" className="jl-clear-filters" onClick={clearFilters}>
            Clear all filters
          </button>
        </div>
      </section>

      <section className={`jl-shop-section ${PRODUCT_SECTION_SHELL_CLASS}`} aria-live="polite">
        {loadState === 'loading' ? (
          <>
            <div className="jl-shop-loading-heading">
              <LoaderCircle className="jl-spin" size={26} /> Loading the collection…
            </div>
            <div className={`jl-shop-grid ${PRODUCT_GRID_CLASSES}`} aria-hidden="true">
              {Array.from({ length: 8 }).map((_, index) => (
                <div className="jl-product-skeleton" key={index}>
                  <div />
                  <span />
                  <span />
                  <button tabIndex={-1} />
                </div>
              ))}
            </div>
          </>
        ) : loadState === 'error' ? (
          <div className="jl-shop-state jl-shop-error" role="alert">
            <AlertCircle size={38} />
            <h2>We could not load the collection</h2>
            <p>{loadError}</p>
            <button type="button" onClick={() => void loadCatalog()}>
              <RefreshCw size={17} /> Try again
            </button>
          </div>
        ) : (
          <>
            <div className="jl-shop-result-bar">
              <p><strong>{filteredAndSortedProducts.length}</strong> products curated for you</p>
              {hasFilters && <button type="button" onClick={clearFilters}>Reset selection</button>}
            </div>

            {paginatedProducts.length > 0 ? (
              <div className={`jl-shop-grid ${PRODUCT_GRID_CLASSES}`}>
                {paginatedProducts.map((product) => (
                  <ProductCard
                    p={product}
                    key={product.id}
                    onQuickView={setQuickViewProduct}
                  />
                ))}
              </div>
            ) : (
              <div className="jl-shop-state jl-shop-empty">
                <Search size={34} />
                <h2>No products found</h2>
                <p>Your search or filters did not match any products.</p>
                <button type="button" onClick={clearFilters}>View all products</button>
              </div>
            )}

            {totalPages > 1 && (
              <nav className="jl-pagination" aria-label="Product pages">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span>Page {currentPage} of {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </nav>
            )}
          </>
        )}
      </section>

      <Footer />
    </main>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <ShopContent />
    </Suspense>
  );
}
