import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Sign In',
  description: 'Private JayLuxe account page.',
  path: '/login',
  noIndex: true,
});

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
