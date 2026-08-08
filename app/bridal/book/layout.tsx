import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Bridal Booking',
  description: 'Submit a private JayLuxe bridal booking request.',
  path: '/bridal/book',
  noIndex: true,
});

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
