import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Invoice',
  description: 'Private JayLuxe invoice.',
  path: '/invoice',
  noIndex: true,
});

export default function InvoiceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
