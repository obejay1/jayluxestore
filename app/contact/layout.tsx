import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Contact',
  description: 'Contact JayLuxe Client Care for orders, services, bridal bookings and general enquiries.',
  path: '/contact',
});

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
