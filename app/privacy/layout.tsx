import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Privacy Policy',
  description: 'Read the JayLuxe privacy policy and how customer information is handled.',
  path: '/privacy',
});

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
