'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import ProductCard from '@/components/ProductCard';
import QuickViewModal from '@/components/QuickViewModal';
import Footer from '@/components/Footer';
import { addToCart, getProducts, getWishlist } from '@/lib/store';
import { Product } from '@/lib/types';
import { Heart, ShoppingBag, Sparkles } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { PRODUCT_GRID_CLASSES } from '@/lib/layoutClasses';

export default function WishlistPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  async function loadWishlist() {
    const all = await getProducts();
    const ids = getWishlist();
    setProducts(all.filter((product) => ids.includes(product.id)));
  }

  useEffect(() => {
    loadWishlist();
    const onWishlistUpdate = () => loadWishlist();
    window.addEventListener('wishlist', onWishlistUpdate);
    return () => window.removeEventListener('wishlist', onWishlistUpdate);
  }, []);

  const addAllToCart = () => {
    products.forEach((product) => addToCart(product.id, 1));
    showToast(`${products.length} item${products.length === 1 ? '' : 's'} added to cart`, 'success');
  };

  return (
    <main className="wishlist-page">
      {quickViewProduct && <QuickViewModal product={quickViewProduct} onClose={() => setQuickViewProduct(null)} />}

      <section className="wishlist-hero">
        <div className="wishlist-icon"><Heart size={32} fill="currentColor" /></div>
        <p className="wishlist-label">Your private edit</p>
        <h1 className="font-serif">My Wishlist</h1>
        <p className="wishlist-subtitle">Save your favourite JayLuxe fashion, beauty and lifestyle pieces, then return whenever you are ready.</p>
      </section>

      <section className="wishlist-content">
        <div className="wishlist-header">
          <div>
            <p className="wishlist-small-title">Saved Collection</p>
            <h2>{products.length} item{products.length === 1 ? '' : 's'} saved</h2>
          </div>
          <div className="wishlist-header-actions">
            {products.length > 0 && <button type="button" className="wishlist-add-all" onClick={addAllToCart}><ShoppingBag size={18} /> Add All to Cart</button>}
            <Link href="/shop" className="wishlist-shop-link"><Sparkles size={18} /> Continue Shopping</Link>
          </div>
        </div>

        {products.length === 0 ? (
          <motion.div className="wishlist-empty" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
            <div className="wishlist-empty-icon"><Heart size={42} /></div>
            <p className="wishlist-small-title">Your collection begins here</p>
            <h2>Your wishlist is empty</h2>
            <p>Explore the JayLuxe collection and select the heart icon on any product you would like to save.</p>
            <Link href="/shop" className="wishlist-empty-btn">Browse Products</Link>
          </motion.div>
        ) : (
          <div className={`wishlist-grid ${PRODUCT_GRID_CLASSES}`}>
            <AnimatePresence mode="popLayout">
              {products.map((product) => (
                <motion.div key={product.id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.88, y: 10 }} transition={{ duration: 0.3 }}>
                  <ProductCard p={product} onQuickView={setQuickViewProduct} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
