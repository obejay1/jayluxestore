import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Promotions',
  description: 'Discover current JayLuxe promotions and featured offers.',
  path: '/promotions',
});

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
