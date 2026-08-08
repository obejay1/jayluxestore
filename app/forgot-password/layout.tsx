import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Reset Password',
  description: 'Private JayLuxe account page.',
  path: '/forgot-password',
  noIndex: true,
});

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
