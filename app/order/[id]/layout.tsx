import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Order Confirmation',
  description: 'Private JayLuxe order details.',
  path: '/order',
  noIndex: true,
});

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
