import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Secure Checkout',
  description: 'Complete your JayLuxe purchase securely.',
  path: '/checkout',
  noIndex: true,
});

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
