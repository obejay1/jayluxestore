import type { Metadata } from 'next';

import { createPageMetadata } from '@/lib/seo';

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  return createPageMetadata({
    title: 'Product Details',
    description: 'View JayLuxe product details, pricing and availability.',
    path: `/product/${encodeURIComponent(params.id)}`,
  });
}

export default function ProductLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
