import type { MetadataRoute } from 'next';

import { getSiteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/api',
          '/checkout',
          '/account',
          '/order',
          '/invoice',
          '/login',
          '/register',
          '/forgot-password',
          '/bridal/book',
        ],
      },
    ],
    sitemap: new URL('/sitemap.xml', siteUrl).toString(),
  };
}
