import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Search',
  description: 'JayLuxe search results.',
  path: '/search',
  noIndex: true,
});

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
