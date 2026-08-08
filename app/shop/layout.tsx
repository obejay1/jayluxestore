import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Shop',
  description: 'Explore the full collection of luxury fashion, beauty and lifestyle products from JayLuxe.',
  path: '/shop',
});

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
