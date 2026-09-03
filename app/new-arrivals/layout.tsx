import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'New Arrivals',
  description: 'Discover the latest fashion, beauty and lifestyle arrivals from JayLuxe.',
  path: '/new-arrivals',
});

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
