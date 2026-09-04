import type { MetadataRoute } from 'next';

import { getActiveProductsServer } from '@/lib/productServer';
import { getSiteUrl } from '@/lib/site';

export const revalidate = 3600;


function safeLastModified(value: string | undefined, fallback: Date) {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

const routes = [
  '', '/about', '/best-sellers', '/bridal', '/categories', '/contact', '/faq',
  '/featured-products', '/flash-sale', '/gallery', '/new-arrivals', '/privacy',
  '/promotions', '/services', '/shop', '/terms', '/testimonials',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();
  const products = await getActiveProductsServer();

  const staticEntries: MetadataRoute.Sitemap = routes.map((route) => ({
    url: new URL(route || '/', siteUrl).toString(),
    lastModified: now,
    changeFrequency: route === '/shop' || route === '' ? 'daily' : 'monthly',
    priority: route === '' ? 1 : route === '/shop' ? 0.9 : 0.6,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: new URL(`/product/${encodeURIComponent(product.id)}`, siteUrl).toString(),
    lastModified: safeLastModified(product.updatedAt || product.createdAt, now),
    changeFrequency: 'weekly',
    priority: product.featured || product.bestseller ? 0.85 : 0.75,
  }));

  return [...staticEntries, ...productEntries];
}
