'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ChevronLeft,
  Heart,
  LoaderCircle,
  RotateCcw,
  Shield,
  ShoppingBag,
  Star,
  Truck,
} from 'lucide-react';

import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import ProductReviews from '@/components/ProductReviews';
import ResponsiveImage from '@/components/ResponsiveImage';
import {
  addRecentlyViewed,
  addToCart,
  getProducts,
  getRecentlyViewed,
  getWishlist,
  toggleWishlist,
} from '@/lib/store';
import { showToast } from '@/lib/toast';
import { PRODUCT_GRID_CLASSES } from '@/lib/layoutClasses';
import type { Product } from '@/lib/types';
import type { ProductReviewSummary } from '@/lib/productReviews';

const QuickViewModal = dynamic(() => import('@/components/QuickViewModal'), {
  ssr: false,
  loading: () => <div className="jl-modal-loading" role="status">Opening quick view…</div>,
});

type LoadState = 'loading' | 'ready' | 'error';

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [product, setProduct] = useState<Product | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [activeTab, setActiveTab] = useState('description');
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const [isZoomed, setIsZoomed] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  const handleReviewSummary = useCallback((summary: ProductReviewSummary) => {
    setProduct((current) => current ? { ...current, rating: summary.averageRating, reviewCount: summary.reviewCount } : current);
  }, []);

  const loadProduct = useCallback(async () => {
    setLoadState('loading');

    try {
      const products = await getProducts();
      setAllProducts(products);
      setProduct(products.find((item) => item.id === id && item.active !== false) || null);
      setLoadState('ready');
    } catch (error) {
      console.error('Failed to load product:', error);
      setProduct(null);
      setLoadState('error');
    }
  }, [id]);

  useEffect(() => {
    void loadProduct();
    addRecentlyViewed(id);
    setRecentIds(getRecentlyViewed());
    setQuantity(1);
    setActiveImage(0);
  }, [id, loadProduct]);

  useEffect(() => {
    const updateWishlist = () => setWishlist(getWishlist());
    updateWishlist();
    window.addEventListener('wishlist', updateWishlist);
    return () => window.removeEventListener('wishlist', updateWishlist);
  }, []);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return allProducts
      .filter((item) => item.type !== 'service' && item.active !== false && item.id !== product.id && item.category === product.category)
      .slice(0, 4);
  }, [product, allProducts]);

  const recommendedProducts = useMemo(() => {
    if (!product) return [];
    return allProducts
      .filter((item) => item.type !== 'service' && item.active !== false && item.id !== product.id && item.category !== product.category && (item.featured || item.bestseller))
      .slice(0, 4);
  }, [product, allProducts]);

  const recentlyViewedProducts = useMemo(
    () => recentIds
      .map((recentId) => allProducts.find((item) => item.id === recentId))
      .filter((item): item is Product => Boolean(item && item.id !== id && item.active !== false))
      .slice(0, 4),
    [recentIds, allProducts, id],
  );

  if (loadState === 'loading') {
    return (
      <main className="jl-product-page">
        <div className="jl-product-not-found" role="status" aria-busy="true">
          <LoaderCircle className="jl-spin" size={42} aria-hidden="true" />
          <h1 className="font-serif">Loading product</h1>
          <p>Preparing the product details…</p>
        </div>
      </main>
    );
  }

  if (loadState === 'error') {
    return (
      <main className="jl-product-page">
        <div className="jl-product-not-found" role="alert">
          <AlertCircle size={42} aria-hidden="true" />
          <h1 className="font-serif">We could not load this product</h1>
          <p>Check your connection and try again.</p>
          <button type="button" className="jl-product-not-found-btn" onClick={() => void loadProduct()}>Try Again</button>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="jl-product-page">
        <div className="jl-product-not-found">
          <ShoppingBag size={42} aria-hidden="true" />
          <h1 className="font-serif">Product Not Found</h1>
          <p>This product may be unavailable or may have moved.</p>
          <Link href="/shop" className="jl-product-not-found-btn"><ChevronLeft size={20} aria-hidden="true" /> Back to Shop</Link>
        </div>
      </main>
    );
  }

  const currentProduct = product;
  const images = [currentProduct.image, ...(currentProduct.gallery || [])].filter(Boolean);
  const rating = Math.max(0, Number(currentProduct.rating || 0));
  const reviewCount = Math.max(0, Number(currentProduct.reviewCount || 0));
  const availableSizes = Array.isArray(currentProduct.sizes) ? currentProduct.sizes.filter(Boolean) : [];
  const stock = Math.max(0, Number(currentProduct.stock ?? 1));
  const wishlisted = wishlist.includes(currentProduct.id);
  const discount = currentProduct.discount || (
    currentProduct.oldPrice && currentProduct.oldPrice > currentProduct.price
      ? Math.round(((currentProduct.oldPrice - currentProduct.price) / currentProduct.oldPrice) * 100)
      : 0
  );

  const tabs = [
    { id: 'description', label: 'Description' },
    { id: 'specifications', label: 'Specifications' },
    { id: 'reviews', label: `Reviews (${reviewCount})` },
    { id: 'shipping', label: 'Shipping' },
    { id: 'returns', label: 'Returns' },
  ];

  function handleAddToCart() {
    if (stock <= 0) return;
    addToCart(currentProduct.id, Math.min(quantity, stock));
    showToast(`${currentProduct.name} added to cart`, 'success');
  }

  function handleBuyNow() {
    if (stock <= 0) return;
    addToCart(currentProduct.id, Math.min(quantity, stock));
    router.push('/checkout');
  }

  function handleToggleWishlist() {
    toggleWishlist(currentProduct.id);
    showToast(wishlisted ? 'Removed from wishlist' : 'Saved to wishlist', 'success');
  }

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
    setZoomPosition({
      x: ((event.clientX - left) / width) * 100,
      y: ((event.clientY - top) / height) * 100,
    });
  }

  return (
    <main className="jl-product-page">
      {quickViewProduct && <QuickViewModal product={quickViewProduct} onClose={() => setQuickViewProduct(null)} />}

      <div className="jl-product-wrap">
        <div className="jl-product-gallery">
          <div
            className="jl-product-main-image"
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsZoomed(true)}
            onMouseLeave={() => setIsZoomed(false)}
          >
            <ResponsiveImage
              src={images[activeImage]}
              alt={product.name}
              width={760}
              height={860}
              priority
              sizes="(max-width: 800px) 100vw, 52vw"
              style={{
                transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                transform: isZoomed ? 'scale(1.65)' : 'scale(1)',
              }}
            />
            <div className="jl-product-gallery-badges" aria-label="Product labels">
              {product.isNew && <span>New</span>}
              {discount > 0 && <span>-{discount}%</span>}
            </div>
            <button
              type="button"
              onClick={handleToggleWishlist}
              className={`jl-product-heart${wishlisted ? ' active' : ''}`}
              aria-pressed={wishlisted}
              aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
            >
              <Heart size={23} fill={wishlisted ? 'currentColor' : 'none'} aria-hidden="true" />
            </button>
          </div>

          {images.length > 1 && (
            <div className="jl-product-thumbs" aria-label="Product image gallery">
              {images.map((image, index) => (
                <button
                  type="button"
                  key={`${image}-${index}`}
                  onClick={() => setActiveImage(index)}
                  className={activeImage === index ? 'active' : ''}
                  aria-pressed={activeImage === index}
                  aria-label={`Show ${product.name} image ${index + 1}`}
                >
                  <ResponsiveImage src={image} alt="" width={96} height={96} sizes="96px" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="jl-product-info">
          <nav className="jl-product-breadcrumb" aria-label="Breadcrumb">
            <Link href="/shop">Shop</Link><span aria-hidden="true">/</span>
            <Link href={`/shop?category=${encodeURIComponent(product.category || '')}`}>{product.category || 'Collection'}</Link>
          </nav>
          <p className="jl-product-kicker">JayLuxe Curated Selection</p>
          <h1 className="font-serif">{product.name}</h1>

          <div className="jl-product-rating" aria-label={reviewCount ? `${rating.toFixed(1)} out of 5 from ${reviewCount} reviews` : 'No published reviews yet'}>
            <span aria-hidden="true">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} size={17} fill={reviewCount && index < Math.round(rating) ? 'currentColor' : 'none'} />
              ))}
            </span>
            <p>{reviewCount ? `${rating.toFixed(1)} · ${reviewCount} reviews` : 'Not yet reviewed'}</p>
          </div>

          <div className="jl-product-meta-grid">
            <span><small>Availability</small><strong className={stock > 0 ? 'in-stock' : 'out-stock'}>{stock > 0 ? 'In Stock' : 'Out of Stock'}</strong></span>
            <span><small>Category</small><strong>{product.category || 'Luxury Collection'}</strong></span>
            <span><small>SKU</small><strong>{product.sku || `JL-${product.id.slice(0, 8).toUpperCase()}`}</strong></span>
          </div>

          <div className="jl-product-price-row">
            <strong className="font-serif">₦{product.price.toLocaleString('en-NG')}</strong>
            {product.oldPrice && product.oldPrice > product.price && <del>₦{product.oldPrice.toLocaleString('en-NG')}</del>}
            {discount > 0 && <span className="jl-product-discount">Save {discount}%</span>}
          </div>

          <p className="jl-product-desc">{product.description || 'A premium JayLuxe piece selected for its beauty, quality and timeless appeal.'}</p>

          {availableSizes.length ? (
            <section className="jl-product-sizes" aria-labelledby="available-product-sizes">
              <div>
                <span className="jl-product-size-label" id="available-product-sizes">Available Sizes</span>
                <small>Available for this product</small>
              </div>
              <div className="jl-product-size-list" aria-label={`Available sizes: ${availableSizes.join(', ')}`}>
                {availableSizes.map((size) => <span key={size}>{size}</span>)}
              </div>
            </section>
          ) : null}

          <div className="jl-product-benefits">
            <div><Truck size={20} aria-hidden="true" /><span><strong>Fast Delivery</strong><small>Across Nigeria</small></span></div>
            <div><Shield size={20} aria-hidden="true" /><span><strong>Authentic Quality</strong><small>Carefully selected</small></span></div>
            <div><RotateCcw size={20} aria-hidden="true" /><span><strong>Client Care</strong><small>Support when needed</small></span></div>
          </div>

          <div className="jl-product-purchase-box">
            <div className="jl-product-qty">
              <span>Quantity</span>
              <div>
                <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={quantity <= 1} aria-label="Decrease quantity">−</button>
                <strong aria-live="polite">{quantity}</strong>
                <button type="button" onClick={() => setQuantity((value) => Math.min(stock, value + 1))} disabled={stock <= 0 || quantity >= stock} aria-label="Increase quantity">+</button>
              </div>
            </div>
            <div className="jl-product-actions">
              <button type="button" className="jl-add-cart" onClick={handleAddToCart} disabled={stock <= 0}>Add to Cart</button>
              <button type="button" className="jl-buy-now" onClick={handleBuyNow} disabled={stock <= 0}>Buy Now</button>
              <button type="button" className={`jl-wishlist-action${wishlisted ? ' active' : ''}`} onClick={handleToggleWishlist} aria-pressed={wishlisted}>
                <Heart size={18} fill={wishlisted ? 'currentColor' : 'none'} aria-hidden="true" /> {wishlisted ? 'Saved' : 'Wishlist'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <section className="jl-product-tabs" aria-label="Product information">
        <div className="jl-product-tab-buttons" role="tablist" aria-label="Product details">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.id}
              id={`product-tab-${tab.id}`}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`product-panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              className={activeTab === tab.id ? 'active' : ''}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          id={`product-panel-${activeTab}`}
          className="jl-product-tab-content"
          role="tabpanel"
          aria-labelledby={`product-tab-${activeTab}`}
          tabIndex={0}
        >
          {activeTab === 'description' && (
            <div className="jl-tab-copy"><h2>Designed for elevated everyday living</h2><p>{product.description || 'This item belongs to the JayLuxe curated collection of premium fashion, beauty and lifestyle essentials.'}</p><p>Every order is prepared with care and supported by our client-care team.</p></div>
          )}
          {activeTab === 'specifications' && (
            <div className="jl-spec-grid"><div><span>Product</span><strong>{product.name}</strong></div><div><span>Category</span><strong>{product.category || 'Luxury Collection'}</strong></div><div><span>SKU</span><strong>{product.sku || `JL-${product.id.slice(0, 8).toUpperCase()}`}</strong></div><div><span>Availability</span><strong>{stock > 0 ? `${stock} available` : 'Out of stock'}</strong></div><div><span>Quality</span><strong>JayLuxe selected</strong></div><div><span>Support</span><strong>Client care included</strong></div></div>
          )}
          {activeTab === 'reviews' && (
            <ProductReviews
              productId={currentProduct.id}
              productName={currentProduct.name}
              onSummaryChange={handleReviewSummary}
            />
          )}
          {activeTab === 'shipping' && (
            <div className="jl-tab-copy"><h2>Nationwide delivery</h2><p>Delivery options and fees are calculated during checkout based on the selected address. Estimated delivery timing is displayed before payment.</p><p>Orders are carefully packed and can be followed through the available order-status tools.</p></div>
          )}
          {activeTab === 'returns' && (
            <div className="jl-tab-copy"><h2>Client-care support</h2><p>Contact JayLuxe promptly if an item arrives damaged or differs from your order. Eligibility depends on item condition, category and the circumstances of delivery.</p><p>Beauty and hygiene-sensitive products may require sealed, unused packaging.</p></div>
          )}
        </div>
      </section>

      <ProductRail title="Related Products" products={relatedProducts} onQuickView={setQuickViewProduct} />
      <ProductRail title="Recommended for You" products={recommendedProducts} onQuickView={setQuickViewProduct} />
      <ProductRail title="Recently Viewed" products={recentlyViewedProducts} onQuickView={setQuickViewProduct} />

      <Footer />
    </main>
  );
}

function ProductRail({ title, products, onQuickView }: { title: string; products: Product[]; onQuickView: (product: Product) => void }) {
  if (!products.length) return null;
  return (
    <section className="jl-related-products">
      <div className="jl-related-head"><p>Discover more</p><h2 className="font-serif">{title}</h2></div>
      <div className={`jl-related-grid ${PRODUCT_GRID_CLASSES}`}>{products.map((item) => <ProductCard p={item} key={item.id} onQuickView={onQuickView} />)}</div>
    </section>
  );
}
