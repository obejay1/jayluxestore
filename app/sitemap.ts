import type { MetadataRoute } from 'next';

import { getSiteUrl } from '@/lib/site';

const routes = [
  '',
  '/about',
  '/bridal',
  '/categories',
  '/contact',
  '/faq',
  '/gallery',
  '/privacy',
  '/promotions',
  '/services',
  '/shop',
  '/terms',
  '/testimonials',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const now = new Date();

  return routes.map((route) => ({
    url: new URL(route || '/', siteUrl).toString(),
    lastModified: now,
    changeFrequency: route === '/shop' || route === '' ? 'daily' : 'monthly',
    priority: route === '' ? 1 : route === '/shop' ? 0.9 : 0.6,
  }));
}
