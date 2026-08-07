import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Order Confirmation | Jayluxe',
  description: 'Thank you for your order from Jayluxe.',
};

export default function OrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}