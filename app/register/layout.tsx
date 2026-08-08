import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Create Account',
  description: 'Private JayLuxe account page.',
  path: '/register',
  noIndex: true,
});

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
