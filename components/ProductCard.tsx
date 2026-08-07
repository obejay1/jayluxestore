'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MouseEvent, useEffect, useMemo, useState } from 'react';
import { Eye, Heart, ShoppingBag, Star } from 'lucide-react';

import { DEFAULT_PRODUCT_IMAGE, getSafeImageSource } from '@/lib/images';
import type { Product } from '@/lib/types';
import { addToCart, getWishlist, toggleWishlist } from '@/lib/store';
import { showToast } from '@/lib/toast';

type ProductCardProps = {
  p: Product;
  onQuickView?: (product: Product) => void;
};


function formatPrice(value: number) {
  return `₦${Number(value || 0).toLocaleString('en-NG')}`;
}

export default function ProductCard({ p, onQuickView }: ProductCardProps) {
  const [wishlisted, setWishlisted] = useState(false);
  const [imageSource, setImageSource] = useState(getSafeImageSource(p.image));
  const outOfStock = Number(p.stock ?? 1) <= 0;
  const rating = Math.max(0, Math.min(5, Number(p.rating || 0)));
  const reviewCount = Math.max(0, Number(p.reviewCount || 0));

  useEffect(() => {
    setImageSource(getSafeImageSource(p.image));
  }, [p.image]);

  useEffect(() => {
    const syncWishlist = () => setWishlisted(getWishlist().includes(p.id));
    syncWishlist();
    window.addEventListener('wishlist', syncWishlist);
    return () => window.removeEventListener('wishlist', syncWishlist);
  }, [p.id]);

  const discount = useMemo(() => {
    if (p.discount) return Math.max(0, Math.round(p.discount));
    if (p.oldPrice && p.oldPrice > p.price) {
      return Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);
    }
    return 0;
  }, [p.discount, p.oldPrice, p.price]);

  function stopLink(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleAddToCart(event: MouseEvent<HTMLButtonElement>) {
    stopLink(event);
    if (outOfStock) return;
    addToCart(p.id, 1);
    showToast(`${p.name} added to cart`, 'success');
  }

  function handleWishlist(event: MouseEvent<HTMLButtonElement>) {
    stopLink(event);
    toggleWishlist(p.id);
    showToast(wishlisted ? 'Removed from wishlist' : 'Saved to wishlist', 'success');
  }

  function handleQuickView(event: MouseEvent<HTMLButtonElement>) {
    stopLink(event);
    onQuickView?.(p);
  }

  return (
    <article className="lux-product-card tw-flex tw-h-full tw-min-w-0 tw-flex-col tw-overflow-hidden">
      <div className="lux-product-image tw-relative tw-w-full tw-overflow-hidden tw-aspect-[4/5]">
        <Link href={`/product/${p.id}`} aria-label={`View ${p.name}`}>
          <Image
            src={imageSource}
            alt={p.name}
            fill
            sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
            className="lux-product-img"
            onError={() => setImageSource(DEFAULT_PRODUCT_IMAGE)}
          />
        </Link>

        <div className="lux-product-badges" aria-label="Product labels">
          {p.isNew && <span className="lux-badge lux-badge-new">New</span>}
          {discount > 0 && <span className="lux-badge lux-badge-sale">-{discount}%</span>}
          {outOfStock && <span className="lux-badge lux-badge-stock">Sold out</span>}
        </div>

        <button
          type="button"
          className={`lux-product-wishlist${wishlisted ? ' active' : ''}`}
          onClick={handleWishlist}
          aria-pressed={wishlisted}
          aria-label={wishlisted ? `Remove ${p.name} from wishlist` : `Add ${p.name} to wishlist`}
        >
          <Heart size={19} fill={wishlisted ? 'currentColor' : 'none'} />
        </button>

        {onQuickView && (
          <div className="lux-product-overlay">
            <button type="button" className="lux-quick-view-btn" onClick={handleQuickView}>
              <Eye size={17} /> Quick View
            </button>
          </div>
        )}
      </div>

      <div className="lux-product-info tw-flex tw-min-w-0 tw-flex-1 tw-flex-col">
        <p className="lux-product-category">{p.category || 'JayLuxe Collection'}</p>
        <Link href={`/product/${p.id}`} className="lux-product-title-link">
          <h3 className="tw-line-clamp-2 tw-min-h-[2.8em] tw-break-words">{p.name}</h3>
        </Link>

        <div
          className="lux-product-rating-row"
          aria-label={
            reviewCount > 0
              ? `${rating.toFixed(1)} out of 5 from ${reviewCount} reviews`
              : 'No published reviews yet'
          }
        >
          <span aria-hidden="true">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star
                key={index}
                size={13}
                fill={index < Math.round(rating) ? 'currentColor' : 'none'}
              />
            ))}
          </span>
          <small>{reviewCount > 0 ? `(${reviewCount})` : 'New'}</small>
        </div>

        <div className="lux-product-pricing tw-mt-auto">
          <p className="lux-product-price">{formatPrice(p.price)}</p>
          {p.oldPrice && p.oldPrice > p.price && (
            <p className="lux-product-old-price">{formatPrice(p.oldPrice)}</p>
          )}
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          className="lux-product-add-btn tw-mt-0 tw-w-full"
          disabled={outOfStock}
        >
          <ShoppingBag size={17} /> {outOfStock ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </article>
  );
}
