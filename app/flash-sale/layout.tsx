import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Limited Drops',
  description: 'Discover limited-time JayLuxe offers and promotional drops.',
  path: '/flash-sale',
});

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
