import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'My Account',
  description: 'Your private JayLuxe customer account.',
  path: '/account',
  noIndex: true,
});

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
