import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Shopping Cart',
  description: 'Private JayLuxe shopping cart.',
  path: '/cart',
  noIndex: true,
});

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
