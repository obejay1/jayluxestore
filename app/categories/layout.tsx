import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Categories',
  description: 'Browse JayLuxe product and service categories.',
  path: '/categories',
});

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
