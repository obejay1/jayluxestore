import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Featured Products',
  description: 'Shop featured JayLuxe fashion, beauty and lifestyle selections.',
  path: '/featured-products',
});

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
