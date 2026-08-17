'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Clock3,
  Gift,
  Percent,
  PackageOpen,
  ShoppingBag,
} from 'lucide-react';

import Footer from '@/components/Footer';
import PageHeroIcon from '@/components/PageHeroIcon';
import ProductCard from '@/components/ProductCard';
import QuickViewModal from '@/components/QuickViewModal';
import { getProducts } from '@/lib/store';
import { PRODUCT_GRID_CLASSES, PRODUCT_SECTION_SHELL_CLASS } from '@/lib/layoutClasses';
import type { Product } from '@/lib/types';

const promotionCards = [
  {
    label: 'Limited time',
    title: 'Flash Sales',
    description:
      'Discover selected beauty, fashion and lifestyle pieces available at special prices while stock lasts.',
    href: '/flash-sale',
    linkLabel: 'Shop flash sales',
    icon: Clock3,
    featured: true,
  },
  {
    label: 'Curated value',
    title: 'Special Offers',
    description:
      'Explore hand-picked offers across the JayLuxe collection, including seasonal edits and customer favourites.',
    href: '/shop?collection=sale',
    linkLabel: 'Explore offers',
    icon: Percent,
  },
  {
    label: 'Gift-worthy',
    title: 'Luxury Gift Picks',
    description:
      'Find polished beauty and lifestyle gifts for birthdays, celebrations, bridal moments and thoughtful surprises.',
    href: '/shop?collection=featured',
    linkLabel: 'Shop gift picks',
    icon: Gift,
  },
  {
    label: 'New season',
    title: 'Fresh Arrivals',
    description:
      'Be among the first to discover newly added products and limited seasonal collections.',
    href: '/new-arrivals',
    linkLabel: 'View new arrivals',
    icon: PackageOpen,
  },
  {
    label: 'Most loved',
    title: 'Best Sellers',
    description:
      'Shop the products JayLuxe customers return to for quality, style and dependable everyday luxury.',
    href: '/best-sellers',
    linkLabel: 'Shop best sellers',
    icon: ShoppingBag,
  },
];

export default function PromotionsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  useEffect(() => {
    let cancelled = false;

    getProducts()
      .then((items) => {
        if (!cancelled) setProducts(items);
      })
      .catch((error) => {
        console.error('Promotional products failed to load:', error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const saleProducts = useMemo(
    () =>
      products
        .filter((product) => {
          if (product.active === false || product.type === 'service') return false;
          const oldPrice = Number(product.oldPrice || 0);
          const price = Number(product.price || 0);
          const discount = Number(product.discount || 0);
          return discount > 0 || (oldPrice > 0 && oldPrice > price);
        })
        .slice(0, 8),
    [products],
  );

  return (
    <main className="jl-promotions-page">
      {quickViewProduct ? (
        <QuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      ) : null}

      <section className="jl-promotions-hero">
        <PageHeroIcon icon={Gift} label="JayLuxe promotions" />
        <span>JayLuxe offers</span>
        <h1>Luxury finds, thoughtfully priced.</h1>
        <p>
          Explore flash sales, seasonal edits and limited-time promotions across
          beauty, fashion, bridal and lifestyle collections.
        </p>
        <div className="jl-promotions-hero-actions">
          <Link href="/flash-sale">Shop Flash Sale <ArrowRight size={16} aria-hidden="true" /></Link>
          <Link href="/shop" className="secondary">Browse Collection</Link>
        </div>
      </section>

      <section className="jl-promotions-grid" aria-label="Current promotions">
        {promotionCards.map((promotion, index) => {
          const Icon = promotion.icon;

          return (
            <motion.article
              key={promotion.title}
              className={`jl-promo-card ${promotion.featured ? 'featured' : ''}`}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: index * 0.06 }}
            >
              <Icon size={27} aria-hidden="true" />
              <span>{promotion.label}</span>
              <h2>{promotion.title}</h2>
              <p>{promotion.description}</p>
              <Link href={promotion.href}>
                {promotion.linkLabel} <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </motion.article>
          );
        })}
      </section>

      <section className={`jl-promo-products ${PRODUCT_SECTION_SHELL_CLASS}`}>
        <div className="jj-section-header">
          <div>
            <small>Available now</small>
            <h2>Products on offer</h2>
          </div>
          <Link href="/shop?collection=sale">
            View all offers <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        {loading ? (
          <p role="status">Loading current offers…</p>
        ) : saleProducts.length > 0 ? (
          <div className={`jj-product-grid ${PRODUCT_GRID_CLASSES}`}>
            {saleProducts.map((product) => (
              <ProductCard
                key={product.id}
                p={product}
                onQuickView={setQuickViewProduct}
              />
            ))}
          </div>
        ) : (
          <div className="jl-promo-card">
            <span>Coming soon</span>
            <h2>New offers are being prepared.</h2>
            <p>
              There are no active discounted products right now. Explore the
              full collection while the next promotion is prepared.
            </p>
            <Link href="/shop">
              Shop the collection <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
