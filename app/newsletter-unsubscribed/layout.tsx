import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Newsletter Preferences',
  description: 'JayLuxe newsletter preference confirmation.',
  path: '/newsletter-unsubscribed',
  noIndex: true,
});

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
