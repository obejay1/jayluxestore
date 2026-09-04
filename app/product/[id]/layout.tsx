import type { Metadata } from 'next';

import { getProductServer } from '@/lib/productServer';
import { getSiteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';


function absoluteProductImage(value: string | undefined) {
  if (!value) return undefined;
  try {
    return new URL(value, getSiteUrl()).toString();
  } catch {
    return undefined;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductServer(id);
  const path = `/product/${encodeURIComponent(id)}`;
  const canonical = new URL(path, getSiteUrl()).toString();

  if (!product) {
    return {
      title: 'Product Not Found',
      description: 'This JayLuxe product is unavailable.',
      robots: { index: false, follow: false },
    };
  }

  const description = String(product.description || `Shop ${product.name} at JayLuxe. Luxury beauty, fashion and lifestyle essentials.`).trim().slice(0, 220);
  const image = absoluteProductImage(product.image);

  return {
    title: product.name,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      siteName: 'JayLuxe',
      title: product.name,
      description,
      url: canonical,
      ...(image ? { images: [{ url: image, alt: product.name }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function ProductLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const product = await getProductServer(id);
  const siteUrl = getSiteUrl().toString().replace(/\/$/, '');
  const productJsonLd = product ? {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || undefined,
    image: [product.image, ...(product.gallery || [])].filter(Boolean),
    sku: product.id,
    category: product.category || undefined,
    offers: {
      '@type': 'Offer',
      url: `${siteUrl}/product/${encodeURIComponent(product.id)}`,
      priceCurrency: 'NGN',
      price: Number(product.price || 0),
      availability: Number(product.stock ?? 1) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
    ...(Number(product.rating || 0) > 0 && Number(product.reviewCount || 0) > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: Number(product.rating),
        reviewCount: Number(product.reviewCount),
      },
    } : {}),
  } : null;

  return (
    <>
      {productJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd).replace(/</g, '\\u003c') }}
        />
      ) : null}
      {children}
    </>
  );
}
