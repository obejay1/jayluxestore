import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'About JayLuxe',
  description: 'Learn about JayLuxe, our approach to luxury beauty, fashion, bridal and lifestyle service.',
  path: '/about',
});

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
