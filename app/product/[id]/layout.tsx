import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Product Details',
  description: 'View JayLuxe product details, pricing and availability.',
};

export default function ProductLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
