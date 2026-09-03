import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Best Sellers',
  description: 'Shop popular and best-selling JayLuxe products.',
  path: '/best-sellers',
});

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
