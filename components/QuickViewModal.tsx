'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import FocusLock from 'react-focus-lock';
import { ArrowUpRight, Heart, Shield, ShoppingBag, Truck, X } from 'lucide-react';

import ResponsiveImage from '@/components/ResponsiveImage';
import type { Product } from '@/lib/types';
import { addToCart, getWishlist, toggleWishlist } from '@/lib/store';
import { showToast } from '@/lib/toast';

interface QuickViewModalProps {
  product: Product;
  onClose: () => void;
}


export default function QuickViewModal({ product, onClose }: QuickViewModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [quantity, setQuantity] = useState(1);
  const [wishlisted, setWishlisted] = useState(() => getWishlist().includes(product.id));
  const stock = Math.max(0, Number(product.stock ?? 99));
  const outOfStock = stock <= 0;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

  function handleAddToCart() {
    if (outOfStock) return;
    addToCart(product.id, quantity);
    showToast(`${product.name} added to cart`, 'success');
    onClose();
  }

  function handleWishlist() {
    toggleWishlist(product.id);
    setWishlisted((value) => !value);
    showToast(wishlisted ? 'Removed from wishlist' : 'Saved to wishlist', 'success');
  }

  return (
    <FocusLock returnFocus>
      <div className="quick-view-modal-overlay" onMouseDown={onClose}>
        <div
          className="quick-view-modal"
          onMouseDown={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
        >
          <button type="button" className="quick-view-modal-close" onClick={onClose} aria-label="Close quick view">
            <X size={22} aria-hidden="true" />
          </button>

          <div className="quick-view-image">
            <ResponsiveImage
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 760px) 100vw, 46vw"
            />
          </div>

          <div className="quick-view-details">
            <p className="quick-view-eyebrow">{product.category || 'JayLuxe Collection'}</p>
            <h2 id={titleId} className="font-serif">{product.name}</h2>
            <div className="quick-view-price-row">
              <p className="price">₦{Number(product.price || 0).toLocaleString('en-NG')}</p>
              {product.oldPrice && product.oldPrice > product.price && (
                <del>₦{product.oldPrice.toLocaleString('en-NG')}</del>
              )}
            </div>
            <p id={descriptionId} className="jl-product-desc">
              {product.description || 'A carefully selected JayLuxe fashion and beauty essential.'}
            </p>

            <div className="quick-view-assurances">
              <div><Truck size={19} aria-hidden="true" /> Nationwide delivery</div>
              <div><Shield size={19} aria-hidden="true" /> Authentic quality</div>
            </div>

            <div className="jl-product-qty quick-view-qty">
              <span>Quantity</span>
              <div>
                <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={quantity <= 1} aria-label="Decrease quantity">−</button>
                <strong aria-live="polite">{quantity}</strong>
                <button type="button" onClick={() => setQuantity((value) => Math.min(stock, value + 1))} disabled={outOfStock || quantity >= stock} aria-label="Increase quantity">+</button>
              </div>
            </div>

            <div className="quick-view-actions">
              <button type="button" className="jl-add-cart" onClick={handleAddToCart} disabled={outOfStock}>
                <ShoppingBag size={18} aria-hidden="true" /> {outOfStock ? 'Out of Stock' : 'Add to Cart'}
              </button>
              <button
                type="button"
                className={`quick-view-wishlist${wishlisted ? ' active' : ''}`}
                onClick={handleWishlist}
                aria-pressed={wishlisted}
                aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
              >
                <Heart size={18} fill={wishlisted ? 'currentColor' : 'none'} aria-hidden="true" />
              </button>
            </div>

            <Link href={`/product/${product.id}`} className="quick-view-full-link" onClick={onClose}>
              View full details <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </FocusLock>
  );
}
