import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Account | Jayluxe',
  description: 'Track your orders and view your purchase history with Jayluxe.',
};

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}