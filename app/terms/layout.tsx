import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Terms & Conditions',
  description: 'Read the terms and conditions for using JayLuxe services and shopping online.',
  path: '/terms',
});

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
