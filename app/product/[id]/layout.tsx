import type { Metadata } from 'next';

import { createPageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return createPageMetadata({
    title: 'Product Details',
    description: 'View JayLuxe product details, pricing and availability.',
    path: `/product/${encodeURIComponent(id)}`,
  });
}

export default function ProductLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
