import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'FAQ',
  description: 'Answers to common questions about JayLuxe orders, delivery, services and support.',
  path: '/faq',
});

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
