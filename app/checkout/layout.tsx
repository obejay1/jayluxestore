import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Secure Checkout | Jayluxe',
  description: 'Complete your purchase with Jayluxe. Secure and fast checkout for all your luxury items.',
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}