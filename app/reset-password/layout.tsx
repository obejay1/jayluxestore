import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Choose New Password',
  description: 'Securely choose a new password for your JayLuxe account.',
  path: '/reset-password',
  noIndex: true,
});

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
