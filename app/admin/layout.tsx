import { createPageMetadata } from '@/lib/seo';

import './admin-design-system.css';

export const metadata = createPageMetadata({
  title: 'Administration',
  description: 'Private JayLuxe administration area.',
  path: '/admin',
  noIndex: true,
});

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
