import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Wishlist',
  description: 'Private JayLuxe wishlist.',
  path: '/wishlist',
  noIndex: true,
});

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
