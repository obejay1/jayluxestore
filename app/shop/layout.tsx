import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shop | Jayluxe',
  description: 'Explore the full collection of luxury fashion, beauty, and lifestyle products from Jayluxe.',
};

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}