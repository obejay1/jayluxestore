'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  LoaderCircle,
  Scissors,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';

import Footer from '@/components/Footer';
import ResponsiveImage from '@/components/ResponsiveImage';
import PageHeroIcon from '@/components/PageHeroIcon';
import { getCategories, getProducts } from '@/lib/store';
import type { Category, Product } from '@/lib/types';
import { CATEGORY_GRID_CLASSES } from '@/lib/layoutClasses';

type LoadState = 'loading' | 'ready' | 'error';

function normalize(value?: string) {
  return String(value || '').trim().toLowerCase();
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');

  useEffect(() => {
    async function loadCategories() {
      setLoadState('loading');

      try {
        const [categoryItems, productItems] = await Promise.all([
          getCategories(),
          getProducts(),
        ]);
        setCategories(categoryItems.filter((item) => item.active !== false));
        setProducts(productItems.filter((item) => item.active !== false));
        setLoadState('ready');
      } catch (error) {
        console.error('Failed to load categories:', error);
        setLoadState('error');
      }
    }

    void loadCategories();
  }, []);

  const productImageByCategory = useMemo(() => {
    const images = new Map<string, string>();
    products.forEach((product) => {
      const key = normalize(product.category);
      if (key && product.image && !images.has(key)) images.set(key, product.image);
    });
    return images;
  }, [products]);

  return (
    <main className="jl-editorial-page jl-categories-page">
      <section className="jl-editorial-hero jl-categories-hero">
        <div className="jl-editorial-hero-content">
          <PageHeroIcon icon={ShoppingBag} label="JayLuxe categories" />
          <span><Sparkles size={16} /> Curated Departments</span>
          <h1 className="font-serif">Explore JayLuxe Categories</h1>
          <p>
            Discover premium fashion, beauty, hair, fragrance, lifestyle and
            professional service collections.
          </p>
        </div>
      </section>

      <section className={`jl-category-page-grid ${CATEGORY_GRID_CLASSES}`} aria-live="polite">
        {loadState === 'loading' && (
          <div className="jl-category-loading">
            <LoaderCircle className="jl-spin" size={28} /> Loading departments…
          </div>
        )}

        {loadState === 'error' && (
          <div className="jl-category-error" role="alert">
            <AlertCircle size={34} />
            <h2>Categories are temporarily unavailable</h2>
            <p>Please refresh the page and try again.</p>
          </div>
        )}

        {loadState === 'ready' && categories.map((category) => {
          const isService = category.type === 'service';
          const image = category.image || productImageByCategory.get(normalize(category.name));

          return (
            <Link
              key={category.id}
              href={
                isService
                  ? `/services?category=${encodeURIComponent(category.name)}`
                  : `/shop?category=${encodeURIComponent(category.name)}`
              }
              className="jl-category-page-card"
            >
              <div className="jl-category-page-media">
                {image ? (
                  <ResponsiveImage
                    src={image}
                    alt=""
                    fill
                    sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
                  />
                ) : (
                  <span aria-hidden="true">
                    {isService ? <Scissors size={32} /> : <ShoppingBag size={32} />}
                  </span>
                )}
              </div>

              <div className="jl-category-page-copy">
                <small>{isService ? 'Professional Service' : 'Luxury Collection'}</small>
                <h2>{category.name}</h2>
                <p>
                  {category.description ||
                    (isService
                      ? 'Book a refined beauty experience with JayLuxe professionals.'
                      : 'Explore carefully selected products for elevated everyday living.')}
                </p>
                <span className="jl-category-link">Explore <ArrowRight size={17} /></span>
              </div>
            </Link>
          );
        })}
      </section>

      <Footer />
    </main>
  );
}
