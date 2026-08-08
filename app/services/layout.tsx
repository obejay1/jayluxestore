import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Services',
  description: 'Explore JayLuxe beauty, styling and lifestyle services.',
  path: '/services',
});

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
