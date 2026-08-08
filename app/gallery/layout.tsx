import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Gallery',
  description: 'Explore JayLuxe beauty, bridal, wigs, makeup, gele and lifestyle portfolio.',
  path: '/gallery',
});

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
