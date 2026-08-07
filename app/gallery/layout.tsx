import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Jayluxe Gallery',
  description:
    'Explore Jayluxe beauty, bridal, wigs, makeup, gele and lifestyle portfolio.',
};

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}