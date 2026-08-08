import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Bridal',
  description: 'Explore JayLuxe bridal packages, styling and beauty services for your celebration.',
  path: '/bridal',
});

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
