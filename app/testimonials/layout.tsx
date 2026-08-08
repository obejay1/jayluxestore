import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Testimonials',
  description: 'Read client experiences and testimonials from JayLuxe customers.',
  path: '/testimonials',
});

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
